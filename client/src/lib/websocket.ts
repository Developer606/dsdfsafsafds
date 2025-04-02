import { queryClient } from "./queryClient";
import { io, Socket } from "socket.io-client";

// Configuration constants
const NOTIFICATION_LIMIT = 7; // Maximum notifications to show
const FETCH_DELAY = 200; // 200ms delay for fetch to avoid overloading API
const SOCKET_RECONNECT_ATTEMPTS = 3;
const SOCKET_RECONNECT_DELAY = 1000;
const SOCKET_TIMEOUT = 5000;

// Singleton socket instance for the entire application
let socketInstance: Socket | null = null;

// Debounce mechanism to avoid excessive fetches
const debounces = new Map<string, NodeJS.Timeout>();

// Cache check to prevent redundant invalidations
const lastInvalidationTime = new Map<string, number>();

/**
 * Debounced query invalidation to reduce unnecessary fetches
 */
function debouncedInvalidateQuery(queryKey: string | any[], delay = 300) {
  const key = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
  
  // Clear existing timeout for this key
  if (debounces.has(key)) {
    clearTimeout(debounces.get(key)!);
  }
  
  // Set new timeout
  debounces.set(key, setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
    debounces.delete(key);
  }, delay));
}

/**
 * Rate-limited invalidation that only triggers if enough time has passed
 */
function rateLimitedInvalidation(queryKey: string | any[], minInterval = 2000) {
  const key = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
  const now = Date.now();
  const lastTime = lastInvalidationTime.get(key) || 0;
  
  if (now - lastTime > minInterval) {
    queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
    lastInvalidationTime.set(key, now);
    return true;
  }
  
  return false;
}

/**
 * Handle socket.io events to keep cache fresh with minimal network/CPU usage
 */
function setupSocketHandlers(socket: Socket) {
  // Clear any previous handlers to prevent memory leaks
  socket.removeAllListeners();
  
  // Handle general update notifications
  socket.on('notification_update', () => {
    // For admin notifications, use rate limited invalidation
    rateLimitedInvalidation(["/api/admin/notifications/all"], 5000);
    
    // For user notifications, use optimized direct fetch approach
    const fetchKey = 'notifications-fetch';
    if (debounces.has(fetchKey)) {
      clearTimeout(debounces.get(fetchKey)!);
    }
    
    debounces.set(fetchKey, setTimeout(async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        
        const allNotifications = await response.json();
        
        // Only keep the most recent NOTIFICATION_LIMIT notifications
        const limitedNotifications = allNotifications.slice(0, NOTIFICATION_LIMIT);
        
        // Update the cache directly with optimized data
        queryClient.setQueryData(['/api/notifications'], limitedNotifications);
      } catch (error) {
        // Fallback to invalidation on error
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      } finally {
        debounces.delete(fetchKey);
      }
    }, FETCH_DELAY));
  });
  
  // Handle admin-specific updates
  socket.on('user_update', () => {
    debouncedInvalidateQuery(["/api/admin/users"]);
    debouncedInvalidateQuery(["/api/admin/dashboard/stats"]);
  });
  
  socket.on('message_update', () => {
    debouncedInvalidateQuery(["/api/admin/messages/recent"]);
    debouncedInvalidateQuery(["/api/admin/analytics/messages"]);
  });
  
  socket.on('character_update', () => {
    debouncedInvalidateQuery(["/api/admin/characters/stats"]);
    debouncedInvalidateQuery(["/api/admin/analytics/characters/popularity"]);
  });
  
  socket.on('subscription_update', () => {
    debouncedInvalidateQuery(["/api/admin/plans"]);
  });
  
  // Handle messaging updates
  socket.on('new_message', (data) => {
    if (data.message) {
      const otherUserId = data.message.senderId;
      debouncedInvalidateQuery(["/api/user/conversations"]);
      debouncedInvalidateQuery(["/api/user-messages", otherUserId]);
    }
  });
  
  socket.on('message_sent', (data) => {
    if (data.messageId) {
      debouncedInvalidateQuery(["/api/user-messages"]);
    }
  });
  
  socket.on('message_status_update', (data) => {
    if (data.messageId) {
      debouncedInvalidateQuery(["/api/user-messages"]);
    }
  });
  
  // Handle disconnection and connection events
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
}

/**
 * Optimized WebSocket setup with reduced memory and CPU usage
 */
export const setupWebSocket = (): Socket | null => {
  // Return existing socket if it's already connected
  if (socketInstance?.connected) {
    return socketInstance;
  }
  
  // Clean up existing socket if it exists but isn't connected
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  
  // Create new socket.io instance with optimized settings
  socketInstance = io({
    transports: ['websocket'], // Use only WebSocket transport (more efficient)
    reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
    reconnectionDelay: SOCKET_RECONNECT_DELAY,
    timeout: SOCKET_TIMEOUT,
    upgrade: false, // Disable transport upgrade to reduce overhead
    forceNew: false, // Reuse connection to reduce memory usage
    autoConnect: true // Connect immediately
  });
  
  // Set up event handlers for this socket
  setupSocketHandlers(socketInstance);
  
  // Store in window object for debugging and cross-file access
  (window as any).__websocket = socketInstance;
  
  return socketInstance;
};
