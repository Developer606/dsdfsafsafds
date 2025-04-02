import { ReactNode, useEffect, useRef, useContext, createContext, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type User, type Notification } from '@shared/schema';

// Configuration constants - ultra-optimized for minimal RAM usage
const DEBOUNCE_DELAY = 800; // Increased to 800ms to further reduce processing frequency
const REFRESH_INTERVAL = 300000; // Increased to 5 minutes to minimize polling
const MINIMUM_REFRESH_INTERVAL = 10000; // Increased to 10 seconds to prevent frequent API calls
const MAX_RECONNECT_DELAY = 120000; // Increased to 2 minutes for further resource saving
const NOTIFICATION_BATCH_SIZE = 3; // Further reduced to 3 for even smaller memory allocations
const MAX_CACHE_SIZE = 20; // Reduced maximum cache size to limit memory footprint

// Enhanced context type with additional methods
interface NotificationSocketContextType {
  isConnected: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  pendingNotificationsCount: number;
}

const NotificationSocketContext = createContext<NotificationSocketContextType>({
  isConnected: false,
  refreshNotifications: async () => {},
  markAllAsRead: async () => {},
  pendingNotificationsCount: 0
});

export const useNotificationSocket = () => useContext(NotificationSocketContext);

// Utility function to debounce function calls
function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<Notification[]>([]);
  const lastRefreshTimeRef = useRef<number>(0);
  const connectionAttemptsRef = useRef(0);
  // Using the MAX_RECONNECT_DELAY constant (120000ms) for consistency
  
  // Get current user for authentication
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  // Ultra memory-efficient batch processing of notifications queue
  const processPendingNotifications = useCallback(() => {
    if (pendingNotifications.length === 0) return;
    
    // Process fewer notifications at once to reduce memory spikes
    const batchSize = Math.min(pendingNotifications.length, NOTIFICATION_BATCH_SIZE);
    
    // Get current notifications without creating a copy
    const existingNotifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
    
    // Limit the cache size to prevent memory growth
    let notificationsToStore: Notification[] = [];
    
    // Process a limited batch of notifications
    const processingBatch = pendingNotifications.slice(0, batchSize);
    
    // Create efficient Set for de-duplication - use primitive IDs instead of objects
    const existingIds = new Set<number>();
    for (let i = 0; i < existingNotifications.length; i++) {
      existingIds.add(existingNotifications[i].id);
    }
    
    // Process with minimal allocations
    const newNotifications: Notification[] = [];
    const typeCount: Record<string, number> = {}; // Track counts by type
    
    // Process each notification without creating intermediate arrays
    for (let i = 0; i < processingBatch.length; i++) {
      const notification = processingBatch[i];
      if (!existingIds.has(notification.id)) {
        newNotifications.push(notification);
        
        // Track type for toast aggregation
        const type = notification.type || 'default';
        typeCount[type] = (typeCount[type] || 0) + 1;
      }
    }
    
    if (newNotifications.length > 0) {
      // Combine new and existing notifications, but limit total size
      notificationsToStore = [...newNotifications, ...existingNotifications];
      
      // If we exceed max cache size, truncate the oldest notifications
      if (notificationsToStore.length > MAX_CACHE_SIZE) {
        notificationsToStore = notificationsToStore.slice(0, MAX_CACHE_SIZE);
      }
      
      // Update query cache with our size-limited array
      queryClient.setQueryData(['/api/notifications'], notificationsToStore);
      
      // Show minimal toast notifications - at most one per type
      for (const type in typeCount) {
        const count = typeCount[type];
        if (count === 1) {
          // For a single notification, show its content
          const notification = newNotifications.find(n => (n.type || 'default') === type);
          if (notification) {
            toast({
              title: notification.title,
              description: notification.message.substring(0, 100), // Limit text length
              variant: 'default',
              duration: 3000
            });
          }
        } else if (count > 1) {
          // For multiple notifications, just show the count
          toast({
            title: `${count} new notifications`,
            description: `You have ${count} new ${type} notifications`,
            variant: 'default',
            duration: 3000
          });
        }
      }
    }
    
    // Remove processed notifications from queue
    setPendingNotifications(prev => 
      prev.length <= batchSize ? [] : prev.slice(batchSize)
    );
  }, [pendingNotifications, queryClient, toast]);
  
  // Debounced version of the processing function with increased delay
  const debouncedProcessNotifications = useCallback(
    debounce(processPendingNotifications, DEBOUNCE_DELAY), // Using the global constant (800ms) for consistency
    [processPendingNotifications]
  );
  
  // Effect to process pending notifications when they change
  useEffect(() => {
    if (pendingNotifications.length > 0) {
      debouncedProcessNotifications();
    }
  }, [pendingNotifications, debouncedProcessNotifications]);
  
  // Ultra-optimized function to force refresh notifications with minimal RAM usage
  const refreshNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    const now = Date.now();
    
    // Increase minimum interval to reduce API calls
    if (now - lastRefreshTimeRef.current < MINIMUM_REFRESH_INTERVAL) {
      // Skip refresh if called too frequently
      return;
    }
    
    lastRefreshTimeRef.current = now;
    
    try {
      // Use force-fresh parameter to bypass server cache
      const response = await fetch('/api/notifications?fresh=true&limit=' + MAX_CACHE_SIZE, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      // Parse response with minimal allocations
      const freshNotifications = await response.json();
      
      // Apply size limit to prevent memory growth
      const limitedData = freshNotifications.length > MAX_CACHE_SIZE 
        ? freshNotifications.slice(0, MAX_CACHE_SIZE)
        : freshNotifications;
      
      // Update the query cache with limited, fresh data
      queryClient.setQueryData(['/api/notifications'], limitedData);
      
      return limitedData;
    } catch (error) {
      // Fallback to invalidation only on error
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      return null;
    }
  }, [currentUser, queryClient]);
  
  // Memory-efficient implementation to mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    
    // Get notification data with minimal object creation
    const notifications = queryClient.getQueryData<Notification[]>(['/api/notifications']);
    if (!notifications || notifications.length === 0) return;
    
    // Gather IDs of unread notifications without creating a filtered array copy
    const unreadIds: number[] = [];
    let hasUnread = false;
    
    // Use for loop for better memory efficiency than filter()
    for (let i = 0; i < notifications.length; i++) {
      if (!notifications[i].read) {
        unreadIds.push(notifications[i].id);
        hasUnread = true;
      }
    }
    
    if (!hasUnread) return;
    
    // Optimistically update the cache with minimal object creation
    const updatedNotifications = notifications.map(n => {
      // Only create new objects for items that need to change
      if (!n.read) {
        return { ...n, read: true };
      }
      // Return unchanged items as-is without creating new objects
      return n;
    });
    
    queryClient.setQueryData(['/api/notifications'], updatedNotifications);
    
    // Process in small batches to reduce memory pressure
    const batchSize = 5;
    
    try {
      console.log(`Marking ${unreadIds.length} notifications as read`);
      
      // Process in batches to reduce concurrent connections
      for (let i = 0; i < unreadIds.length; i += batchSize) {
        const batch = unreadIds.slice(i, i + batchSize);
        
        // Process each batch in parallel but limit total concurrency
        await Promise.all(batch.map(async (id) => {
          try {
            await fetch(`/api/notifications/${id}/read`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
          } catch (err) {
            console.error(`Error marking notification ${id} as read:`, err);
            // Don't throw to allow other operations to continue
          }
        }));
      }
      
      console.log(`Completed marking all notifications as read`);
    } catch (error) {
      console.error('Error in markAllAsRead operation:', error);
      // Selective refresh only on failure
      refreshNotifications();
    }
  }, [currentUser, queryClient, refreshNotifications]);
  
  // Memory-optimized socket connection and event handling
  useEffect(() => {
    // Only connect if we have a user
    if (!currentUser) return;
    
    // Use a variable to track active status to prevent memory leaks
    let isActive = true;
    
    // Connection retry with backoff
    const connectWithBackoff = () => {
      if (!isActive) return; // Prevent connection if component is unmounting
      
      // Exponential backoff calculation with memory-efficient math
      const attempts = connectionAttemptsRef.current;
      const delay = Math.min(1000 * (attempts < 8 ? (1 << attempts) : 256), MAX_RECONNECT_DELAY);
      
      console.log(`Connecting to notification socket (attempt ${attempts + 1}, delay: ${delay}ms)`);
      
      // Create socket connection with reduced options to save memory
      const socket = io('/notifications', {
        auth: {
          token: localStorage.getItem('token')
        },
        reconnectionAttempts: 5, // Reduced from 10 to save resources
        reconnectionDelay: delay,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
        timeout: 8000 // Reduced from 10000 to minimize hanging connections
      });
      
      // Only store socket reference if component is still mounted
      if (isActive) {
        socketRef.current = socket;
      } else {
        // If component was unmounted during connection, clean up immediately
        socket.disconnect();
        return;
      }
      
      // Socket event handlers - optimized for memory efficiency
      
      // Create handler functions once rather than inline to reduce closures
      const handleConnect = () => {
        if (!isActive) return;
        console.log('Connected to notification socket');
        setIsConnected(true);
        connectionAttemptsRef.current = 0; // Reset attempts counter on success
        
        // Immediately refresh to ensure we're in sync with the server
        refreshNotifications();
      };
      
      const handleDisconnect = () => {
        if (!isActive) return;
        console.log('Disconnected from notification socket');
        setIsConnected(false);
        connectionAttemptsRef.current++; // Increment attempts counter
      };
      
      const handleError = (error: Error) => {
        if (!isActive) return;
        console.error('Connection error:', error);
        connectionAttemptsRef.current++;
      };
      
      // Ultra memory-efficient notification handler
      const handleNewNotification = (notification: Notification) => {
        if (!isActive) return;
        
        // Use a simple state update with duplicate check to prevent memory issues
        setPendingNotifications(prev => {
          // Fast path: only process if queue isn't already too large
          if (prev.length >= MAX_CACHE_SIZE * 2) {
            // If queue is too large, just return unchanged to prevent memory growth
            return prev;
          }
          
          // Check for duplicates using a for loop instead of .some() for better perf
          let isDuplicate = false;
          for (let i = 0; i < prev.length; i++) {
            if (prev[i].id === notification.id) {
              isDuplicate = true;
              break;
            }
          }
          
          // No change if duplicate
          if (isDuplicate) return prev;
          
          // Add to front of array for more efficient processing (LIFO)
          return [notification, ...prev.slice(0, MAX_CACHE_SIZE * 2 - 1)];
        });
      };
      
      // Memory-optimized broadcast handler
      const handleBroadcast = (data: Omit<Notification, 'userId'>) => {
        if (!isActive || !currentUser) return;
        
        // Only refresh if document is visible to avoid unnecessary processing
        if (document.visibilityState === 'visible') {
          // Use a variable to track if we've already scheduled a refresh
          let refreshScheduled = false;
          
          // Use a minimal timeout approach - we just need one refresh regardless of broadcast count
          if (!refreshScheduled) {
            refreshScheduled = true;
            setTimeout(() => {
              if (isActive) {
                refreshNotifications();
                refreshScheduled = false;
              }
            }, DEBOUNCE_DELAY);
          }
        }
      };
      
      // Ultimate memory-efficient batch handler
      const handleBatch = (data: { notifications: Notification[], count: number }) => {
        if (!isActive || data.count === 0) return;
        
        // Throttle large batches
        const batchToProcess = data.count > NOTIFICATION_BATCH_SIZE 
          ? data.notifications.slice(0, NOTIFICATION_BATCH_SIZE)
          : data.notifications;
        
        // Efficiently update with a single state change
        setPendingNotifications(prev => {
          // First, create a map of existing notification IDs for fast lookups
          const existingIds = new Set<number>();
          for (let i = 0; i < prev.length; i++) {
            existingIds.add(prev[i].id);
          }
          
          // Then build a list of non-duplicate notifications
          const newItems: Notification[] = [];
          for (let i = 0; i < batchToProcess.length; i++) {
            const notification = batchToProcess[i];
            if (!existingIds.has(notification.id)) {
              newItems.push(notification);
              
              // Stop if we hit our max size to prevent memory issues
              if (newItems.length + prev.length >= MAX_CACHE_SIZE * 2) {
                break;
              }
            }
          }
          
          // If nothing new, avoid allocation by returning original array
          if (newItems.length === 0) return prev;
          
          // Combine and limit max size
          const combined = [...newItems, ...prev];
          return combined.length > MAX_CACHE_SIZE * 2 
            ? combined.slice(0, MAX_CACHE_SIZE * 2) 
            : combined;
        });
      };
      
      // Register event handlers
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleError);
      socket.on('new_notification', handleNewNotification);
      socket.on('broadcast_notification', handleBroadcast);
      socket.on('notification_batch', handleBatch);
    };
    
    // Initialize the connection
    connectWithBackoff();
    
    // Use requestAnimationFrame for more efficient periodic refresh when visible
    let refreshTimer: number | null = null;
    
    const scheduleNextRefresh = () => {
      if (!isActive) return;
      
      refreshTimer = window.setTimeout(() => {
        if (isActive && isConnected && document.visibilityState === 'visible') {
          refreshNotifications()
            .finally(() => {
              // Schedule next refresh regardless of success/failure
              if (isActive) {
                scheduleNextRefresh();
              }
            });
        } else {
          // Still schedule next check even if we didn't refresh
          scheduleNextRefresh();
        }
      }, REFRESH_INTERVAL);
    };
    
    // Start the refresh cycle
    scheduleNextRefresh();
    
    // Visibility change optimization - reduces background processing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && isConnected) {
        refreshNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      isActive = false; // Mark as inactive first to prevent further processing
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (refreshTimer !== null) {
        clearTimeout(refreshTimer);
      }
      
      if (socketRef.current) {
        // Remove all listeners before disconnecting to prevent memory leaks
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [currentUser, refreshNotifications, isConnected]);
  
  return (
    <NotificationSocketContext.Provider value={{ 
      isConnected, 
      refreshNotifications,
      markAllAsRead,
      pendingNotificationsCount: pendingNotifications.length
    }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}