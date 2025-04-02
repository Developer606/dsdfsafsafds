import { ReactNode, useEffect, useRef, useContext, createContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type User, type Notification } from '@shared/schema';

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

  // Batch process notifications queue to avoid excessive re-renders
  const processPendingNotifications = useCallback(() => {
    if (pendingNotifications.length === 0) return;
    
    console.log(`Processing ${pendingNotifications.length} pending notifications`);
    
    // Get the current notifications from cache
    const existingNotifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
    
    // Create a Set of existing notification IDs for quick lookup
    const existingIds = new Set(existingNotifications.map(n => n.id));
    
    // Filter out any duplicates from the pending notifications
    const newNotifications = pendingNotifications.filter(n => !existingIds.has(n.id));
    
    if (newNotifications.length > 0) {
      // Merge and update the cache
      const updatedNotifications = [...newNotifications, ...existingNotifications];
      queryClient.setQueryData(['/api/notifications'], updatedNotifications);
      
      // Group notifications by type
      const notificationsByType = newNotifications.reduce((groups, notification) => {
        const type = notification.type || 'default';
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(notification);
        return groups;
      }, {} as Record<string, Notification[]>);
      
      // Show a single toast for each type with count
      Object.entries(notificationsByType).forEach(([type, notifications]) => {
        if (notifications.length === 1) {
          // Single notification of this type
          const notification = notifications[0];
          toast({
            title: notification.title,
            description: notification.message,
            variant: 'default',
            duration: 5000
          });
        } else {
          // Multiple notifications of same type
          toast({
            title: `${notifications.length} new ${type} notifications`,
            description: 'Check your notification panel for details',
            variant: 'default',
            duration: 5000
          });
        }
      });
    }
    
    // Clear the pending notifications
    setPendingNotifications([]);
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
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    
    const notifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) return;
    
    // Optimistically update the cache
    queryClient.setQueryData(['/api/notifications'], 
      notifications.map(n => ({ ...n, read: true }))
    );
    
    // Mark each notification as read on the server
    try {
      await Promise.all(unreadNotifications.map(async (notification) => {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }));
      
      console.log(`Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      // If error, refresh to get the correct state
      refreshNotifications();
    }
  }, [currentUser, queryClient, refreshNotifications]);
  
  // Socket connection and event handling
  useEffect(() => {
    // Only connect if we have a user
    if (!currentUser) return;
    
    // Connection retry with backoff
    const connectWithBackoff = () => {
      // Exponential backoff calculation
      const attempts = connectionAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(1.5, attempts), maxReconnectDelay);
      
      console.log(`Connecting to notification socket (attempt ${attempts + 1}, delay: ${delay}ms)`);
      
      // Create socket connection
      const socket = io('/notifications', {
        auth: {
          token: localStorage.getItem('token')
        },
        reconnectionAttempts: 10,
        reconnectionDelay: delay,
        reconnectionDelayMax: maxReconnectDelay,
        timeout: 10000
      });
      
      socketRef.current = socket;
      
      // Socket event handlers
      socket.on('connect', () => {
        console.log('Connected to notification socket');
        setIsConnected(true);
        connectionAttemptsRef.current = 0; // Reset attempts counter on success
        
        // Immediately refresh to ensure we're in sync with the server
        refreshNotifications();
      });
      
      socket.on('disconnect', () => {
        console.log('Disconnected from notification socket');
        setIsConnected(false);
        connectionAttemptsRef.current++; // Increment attempts counter
      });
      
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        connectionAttemptsRef.current++;
      });
      
      // Handle new notifications - add to pending queue
      socket.on('new_notification', (notification: Notification) => {
        console.log('Received new direct notification:', notification);
        setPendingNotifications(prev => [...prev, notification]);
      });
      
      // Handle broadcast notifications (system-wide)
      socket.on('broadcast_notification', (data: Omit<Notification, 'userId'>) => {
        if (!currentUser) return;
        
        console.log('Received broadcast notification:', data);
        
        // Efficiently refresh notifications from server after a short delay
        setTimeout(() => {
          refreshNotifications();
        }, 300);
      });
      
      // Handle notification batch updates
      socket.on('notification_batch', (data: { notifications: Notification[], count: number }) => {
        console.log(`Received batch of ${data.count} notifications`);
        
        if (data.notifications.length > 0) {
          setPendingNotifications(prev => [...prev, ...data.notifications]);
        }
      });
    };
    
    // Initialize the connection
    connectWithBackoff();
    
    // Set up periodic refresh of notifications every 60 seconds
    const refreshInterval = setInterval(() => {
      if (isConnected && document.visibilityState === 'visible') {
        refreshNotifications();
      }
    }, 60000);
    
    // Clean up on component unmount
    return () => {
      clearInterval(refreshInterval);
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [currentUser, refreshNotifications]);
  
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