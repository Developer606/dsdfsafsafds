import { ReactNode, useEffect, useRef, useContext, createContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type User, type Notification } from '@shared/schema';

interface NotificationSocketContextType {
  isConnected: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationSocketContext = createContext<NotificationSocketContextType>({
  isConnected: false,
  refreshNotifications: async () => {}
});

export const useNotificationSocket = () => useContext(NotificationSocketContext);

export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  // Get current user for authentication
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  // Create a function to refresh notifications that can be called from anywhere
  const refreshNotifications = useCallback(async () => {
    try {
      // Don't depend on currentUser here to avoid circular dependencies
      console.log('Manually refreshing notifications');
      
      // First try using the socket to request fresh notifications if connected
      if (socketRef.current && socketRef.current.connected) {
        console.log('Using socket to refresh notifications');
        // Emit an event to request latest notifications
        socketRef.current.emit('request_notifications');
      }
      
      // Always invalidate the query cache as a fallback mechanism
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [queryClient]);

  // Setup socket connection
  useEffect(() => {
    // Only connect if we have a user
    if (!currentUser) return;
    
    const connectSocket = () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Create socket connection
      const socket = io('/notifications', {
        auth: {
          token: localStorage.getItem('token') // Use stored JWT if available
        },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      socketRef.current = socket;
      
      // Set up socket event listeners
      socket.on('connect', () => {
        console.log('Connected to notification socket');
        setIsConnected(true);
        // Refresh notifications on reconnect to ensure we have the latest data
        refreshNotifications();
      });
      
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Disconnected from notification socket:', reason);
        setIsConnected(false);
        
        // Attempt manual reconnect if normal reconnection fails
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          // Server/client initiated disconnect, need manual reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting manual reconnect...');
            connectSocket();
          }, 5000);
        }
      });
      
      // Handle new notifications
      socket.on('new_notification', (notification: Notification) => {
        console.log('Received new notification:', notification);
        
        // Add the new notification to the cache
        const notifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
        const updatedNotifications = [notification, ...notifications];
        
        // Update the notification count and list
        queryClient.setQueryData(['/api/notifications'], updatedNotifications);
        
        // Show toast notification
        toast({
          title: notification.title,
          description: notification.message,
          variant: 'default',
          duration: 5000
        });
      });
      
      // Handle broadcast notifications (system-wide)
      socket.on('broadcast_notification', (data: Omit<Notification, 'userId'>) => {
        if (!currentUser) return;
        
        console.log('Received broadcast notification:', data);
        
        // Show toast notification immediately
        toast({
          title: data.title,
          description: data.message,
          variant: 'default',
          duration: 5000
        });
        
        // Force an immediate fetch of fresh notifications from server
        const fetchLatestNotifications = async () => {
          try {
            // Wait a moment for the server to finish processing the broadcast
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Fetch notifications directly rather than just invalidating cache
            console.log('Fetching latest notifications after broadcast');
            const response = await fetch('/api/notifications', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to fetch notifications');
            
            const freshNotifications = await response.json();
            
            // Update the query cache with fresh data
            queryClient.setQueryData(['/api/notifications'], freshNotifications);
            console.log('Updated notifications in cache:', freshNotifications.length);
          } catch (error) {
            console.error('Error fetching fresh notifications:', error);
            // Fallback to invalidation on error
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          }
        };
        
        fetchLatestNotifications();
      });
      
      // Handle direct notification refresh responses from server
      socket.on('notification_refresh', (notifications: Notification[]) => {
        console.log('Received notification refresh with', notifications.length, 'notifications');
        
        // Update the query cache directly with fresh data from server
        if (notifications && Array.isArray(notifications)) {
          queryClient.setQueryData(['/api/notifications'], notifications);
          
          // Show a small toast to confirm refresh
          toast({
            title: "Notifications refreshed",
            description: `${notifications.length} notifications loaded`,
            variant: 'default',
            duration: 2000
          });
        }
      });
    };
    
    // Initial connection
    connectSocket();
    
    // Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setIsConnected(false);
    };
  // We're intentionally not including refreshNotifications in the dependency array
  // to avoid circular dependencies, as refreshNotifications uses socketRef which is set in this effect
  }, [currentUser, queryClient, toast]);
  
  return (
    <NotificationSocketContext.Provider value={{ isConnected, refreshNotifications }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}