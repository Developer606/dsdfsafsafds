import { ReactNode, useEffect, useRef, useContext, createContext, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type User, type Notification } from '@shared/schema';

// Configuration constants
const DEBOUNCE_DELAY = 300; // ms
const REFRESH_INTERVAL = 60000; // ms
const MINIMUM_REFRESH_INTERVAL = 2000; // ms
const MAX_RECONNECT_DELAY = 30000; // ms
const NOTIFICATION_BATCH_SIZE = 10; // Max notifications to process at once

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
  const maxReconnectDelay = 30000; // Max 30 seconds between reconnection attempts
  
  // Get current user for authentication
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  // Memory-efficient batch processing of notifications queue
  const processPendingNotifications = useCallback(() => {
    if (pendingNotifications.length === 0) return;
    
    // Limit number of notifications to process at once to conserve memory
    const batchSize = Math.min(pendingNotifications.length, NOTIFICATION_BATCH_SIZE);
    console.log(`Processing ${batchSize} of ${pendingNotifications.length} pending notifications`);
    
    // Get current notifications without creating a copy
    const existingNotifications = queryClient.getQueryData<Notification[]>(['/api/notifications']);
    
    // Process a limited batch of notifications to reduce memory pressure
    const processingBatch = pendingNotifications.slice(0, batchSize);
    
    // Create efficient Set for de-duplication
    const existingIds = new Set();
    if (existingNotifications) {
      // Use for loop instead of map for better memory efficiency
      for (let i = 0; i < existingNotifications.length; i++) {
        existingIds.add(existingNotifications[i].id);
      }
    }
    
    // Filter efficiently without creating large intermediate arrays
    const newNotifications: Notification[] = [];
    const typeMap: Record<string, number> = {}; // Track counts by type instead of arrays
    let hasNewNotifications = false;
    
    // Process each notification with minimal object creation
    for (let i = 0; i < processingBatch.length; i++) {
      const notification = processingBatch[i];
      if (!existingIds.has(notification.id)) {
        newNotifications.push(notification);
        hasNewNotifications = true;
        
        // Track notification type counts for toasts
        const type = notification.type || 'default';
        typeMap[type] = (typeMap[type] || 0) + 1;
      }
    }
    
    if (hasNewNotifications) {
      // Update query cache with minimal array creation
      if (existingNotifications) {
        queryClient.setQueryData(['/api/notifications'], 
          [...newNotifications, ...existingNotifications]
        );
      } else {
        queryClient.setQueryData(['/api/notifications'], newNotifications);
      }
      
      // Show compact toast notifications
      Object.entries(typeMap).forEach(([type, count]) => {
        if (count === 1) {
          // Find the single notification of this type
          const singleNotification = newNotifications.find(n => (n.type || 'default') === type);
          if (singleNotification) {
            toast({
              title: singleNotification.title,
              description: singleNotification.message,
              variant: 'default',
              duration: 3000 // Shorter duration to reduce UI clutter
            });
          }
        } else if (count > 1) {
          // Multiple notifications of same type - just show count
          toast({
            title: `${count} new ${type} notifications`,
            description: 'Check your notification panel for details',
            variant: 'default',
            duration: 3000
          });
        }
      });
    }
    
    // Remove processed notifications from queue
    setPendingNotifications(prevState => 
      prevState.length <= batchSize ? [] : prevState.slice(batchSize)
    );
  }, [pendingNotifications, queryClient, toast]);
  
  // Debounced version of the processing function
  const debouncedProcessNotifications = useCallback(
    debounce(processPendingNotifications, 300), 
    [processPendingNotifications]
  );
  
  // Effect to process pending notifications when they change
  useEffect(() => {
    if (pendingNotifications.length > 0) {
      debouncedProcessNotifications();
    }
  }, [pendingNotifications, debouncedProcessNotifications]);
  
  // Function to force refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    const now = Date.now();
    const minimumInterval = 2000; // Minimum 2 seconds between refreshes
    
    if (now - lastRefreshTimeRef.current < minimumInterval) {
      console.log('Throttling notification refresh');
      return;
    }
    
    lastRefreshTimeRef.current = now;
    
    try {
      console.log('Manually refreshing notifications');
      // Use force-fresh parameter to bypass server cache
      const response = await fetch('/api/notifications?fresh=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const freshNotifications = await response.json();
      
      // Update the query cache with fresh data
      queryClient.setQueryData(['/api/notifications'], freshNotifications);
      console.log('Updated notifications in cache:', freshNotifications.length);
      
      return freshNotifications;
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      // Fallback to invalidation on error
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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
      
      // Memory-efficient handler that doesn't create a full copy of the notification array
      const handleNewNotification = (notification: Notification) => {
        if (!isActive) return;
        console.log('Received new direct notification:', notification.id);
        setPendingNotifications(prev => {
          // Check if we've already received this notification to prevent duplicates
          if (prev.some(n => n.id === notification.id)) {
            return prev; // No change if duplicate
          }
          return [...prev, notification];
        });
      };
      
      // Handle broadcast with minimal processing in the callback
      const handleBroadcast = (data: Omit<Notification, 'userId'>) => {
        if (!isActive || !currentUser) return;
        
        console.log('Received broadcast notification');
        
        // Queue refresh rather than immediate processing
        if (document.visibilityState === 'visible') {
          const refreshTimer = setTimeout(() => {
            if (isActive) {
              refreshNotifications();
            }
          }, DEBOUNCE_DELAY);
          
          // Clear timer if component unmounts
          return () => clearTimeout(refreshTimer);
        }
      };
      
      // Optimized batch handling to process notifications in smaller groups
      const handleBatch = (data: { notifications: Notification[], count: number }) => {
        if (!isActive) return;
        
        // Log only the count to save on console memory
        if (data.count > 0) {
          console.log(`Received batch: ${data.count} notifications`);
          
          // Only append new notifications that aren't duplicates
          setPendingNotifications(prev => {
            // Create a Set of existing IDs for efficient lookup
            const existingIds = new Set(prev.map(n => n.id));
            
            // Filter only new notifications
            const newNotifications = data.notifications.filter(n => !existingIds.has(n.id));
            
            // If no new notifications, return unchanged
            if (newNotifications.length === 0) {
              return prev;
            }
            
            // Otherwise append new notifications
            return [...prev, ...newNotifications];
          });
        }
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