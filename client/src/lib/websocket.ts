import { queryClient } from "./queryClient";

// Constants for optimized WebSocket behavior
const RECONNECT_DELAY = 5000; // 5 seconds
const NOTIFICATION_LIMIT = 7; // Maximum notifications to keep
const FETCH_DELAY = 200; // 200ms delay for fetch

// Debounce mechanism to avoid excessive fetches
const debounces = new Map<string, NodeJS.Timeout>();

// Cache check to prevent redundant invalidations
let lastInvalidationTime = new Map<string, number>();

/**
 * Debounced query invalidation to reduce unnecessary fetches
 */
function debouncedInvalidateQuery(queryKey: string | any[], delay: number = 300) {
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
function rateLimitedInvalidation(queryKey: string | any[], minInterval: number = 2000) {
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
 * Optimized WebSocket setup with reduced memory and CPU usage
 */
export const setupWebSocket = () => {
  // Only create one socket instance and reuse it
  if ((window as any).__websocket && (window as any).__websocket.readyState === WebSocket.OPEN) {
    return (window as any).__websocket;
  }
  
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const socket = new WebSocket(wsUrl);
  
  // Store the socket in window to prevent multiple connections
  (window as any).__websocket = socket;
  
  // Use a more efficient message handler
  socket.onmessage = (event) => {
    try {
      // Parse the message only once
      const data = JSON.parse(event.data);
      
      // Handle different types of updates with optimized approach
      switch (data.type) {
        // Group admin updates to reduce redundant invalidations
        case 'user_update':
          debouncedInvalidateQuery(["/api/admin/users"]);
          debouncedInvalidateQuery(["/api/admin/dashboard/stats"]);
          break;
          
        case 'message_update':
          debouncedInvalidateQuery(["/api/admin/messages/recent"]);
          debouncedInvalidateQuery(["/api/admin/analytics/messages"]);
          break;
          
        case 'character_update':
          debouncedInvalidateQuery(["/api/admin/characters/stats"]);
          debouncedInvalidateQuery(["/api/admin/analytics/characters/popularity"]);
          break;
          
        case 'subscription_update':
          debouncedInvalidateQuery(["/api/admin/plans"]);
          break;
          
        case 'notification_update':
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
          break;
          
        // Optimize user messaging updates
        case 'new_message':
          if (data.message) {
            const otherUserId = data.message.senderId;
            debouncedInvalidateQuery(["/api/user/conversations"]);
            debouncedInvalidateQuery(["/api/user-messages", otherUserId]);
          }
          break;
          
        case 'message_sent':
        case 'message_status_update':
          if (data.messageId) {
            debouncedInvalidateQuery(["/api/user-messages"]);
          }
          break;
      }
    } catch (error) {
      // Minimal error handling to reduce processing
      console.error("WebSocket error:", error);
    }
  };

  // Minimized event handlers
  socket.onopen = () => socket.readyState === WebSocket.OPEN;
  socket.onerror = () => socket.readyState !== WebSocket.OPEN;

  // Optimized reconnect logic
  socket.onclose = () => {
    // Clean up existing debounces
    debounces.forEach((timeout) => clearTimeout(timeout));
    debounces.clear();
    
    // Only reconnect if no other socket exists
    if (!(window as any).__websocketReconnectTimer) {
      (window as any).__websocketReconnectTimer = setTimeout(() => {
        delete (window as any).__websocket;
        delete (window as any).__websocketReconnectTimer;
        setupWebSocket();
      }, RECONNECT_DELAY);
    }
  };

  return socket;
};
