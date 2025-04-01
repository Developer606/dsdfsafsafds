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
      
      // Create a full notification object
      const notification: Notification = {
        ...data,
        id: Date.now(), // Temporary ID until we refresh from server
        userId: currentUser.id,
        read: false,
        createdAt: new Date()
      };
      
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