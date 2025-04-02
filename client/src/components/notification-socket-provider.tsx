import { ReactNode, useEffect, useRef, useContext, createContext, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type User, type Notification } from '@shared/schema';

interface NotificationSocketContextType {
  isConnected: boolean;
}

const NotificationSocketContext = createContext<NotificationSocketContextType>({
  isConnected: false
});

export const useNotificationSocket = () => useContext(NotificationSocketContext);

export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  // Get current user for authentication
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  useEffect(() => {
    // Only connect if we have a user
    if (!currentUser) return;
    
    // Create socket connection
    const socket = io('/notifications', {
      auth: {
        token: localStorage.getItem('token') // Use stored JWT if available
      }
    });
    
    socketRef.current = socket;
    
    // Set up socket event listeners
    socket.on('connect', () => {
      console.log('Connected to notification socket');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from notification socket');
      setIsConnected(false);
    });
    
    // Handle new notifications
    socket.on('new_notification', (notification: Notification) => {
      // Add the new notification to the cache
      const notifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
      queryClient.setQueryData(['/api/notifications'], [notification, ...notifications]);
      
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
    
    // Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [currentUser, queryClient, toast]);
  
  return (
    <NotificationSocketContext.Provider value={{ isConnected }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}