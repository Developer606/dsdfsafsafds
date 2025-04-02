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

// Constants for optimized behavior
const NOTIFICATION_LIMIT = 7; // Maximum notifications to keep in-memory
const RECONNECT_DELAY = 5000; // 5 seconds
const FETCH_DELAY = 200; // 200ms delay for refetching

// Socket.IO options for performance optimization
const SOCKET_OPTIONS = {
  reconnectionAttempts: 3, // Limit reconnection attempts
  reconnectionDelay: 1000,
  timeout: 5000, // Reduce timeout
  transports: ['websocket'], // Prefer WebSocket only (more efficient)
  upgrade: false // Prevent transport upgrades to reduce overhead
};

export const useNotificationSocket = () => useContext(NotificationSocketContext);

export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  // Get current user for authentication with minimal fetching
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Optimized function to refresh notifications that can be called from anywhere
  const refreshNotifications = useCallback(async () => {
    try {
      if (!currentUser) return;
      
      // Clear any pending fetch timeout to prevent duplicate fetches
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      // Fetch notifications directly rather than just invalidating cache
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const allNotifications = await response.json();
        
        // Only keep the most recent NOTIFICATION_LIMIT notifications in memory
        const limitedNotifications = allNotifications.slice(0, NOTIFICATION_LIMIT);
        
        // Update the cache directly
        queryClient.setQueryData(['/api/notifications'], limitedNotifications);
      } else {
        // Fallback to query invalidation if fetch fails
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [currentUser, queryClient]);

  // Optimized socket connection
  useEffect(() => {
    // Only connect if we have a user
    if (!currentUser) return;
    
    const connectSocket = () => {
      // Clean up any existing socket to prevent memory leaks
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.disconnect();
      }
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Create socket connection with optimized options
      const socket = io('/notifications', {
        auth: {
          token: localStorage.getItem('token')
        },
        ...SOCKET_OPTIONS
      });
      
      socketRef.current = socket;
      
      // Optimized event listeners with minimal processing
      socket.on('connect', () => {
        setIsConnected(true);
        // Refresh notifications on reconnect
        refreshNotifications();
      });
      
      socket.on('connect_error', () => {
        setIsConnected(false);
      });
      
      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        
        // Only attempt manual reconnect if needed
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, RECONNECT_DELAY);
        }
      });
      
      // Handle new notifications with optimized memory usage
      socket.on('new_notification', (notification: Notification) => {
        // Add the new notification to the cache with limit enforcement
        const notifications = queryClient.getQueryData<Notification[]>(['/api/notifications']) || [];
        
        // Only keep the most recent NOTIFICATION_LIMIT notifications
        const updatedNotifications = [notification, ...notifications.slice(0, NOTIFICATION_LIMIT - 1)];
        
        // Update the notification list with the limited set
        queryClient.setQueryData(['/api/notifications'], updatedNotifications);
        
        // Show toast notification with minimal processing
        toast({
          title: notification.title,
          description: notification.message,
          variant: 'default',
          duration: 5000
        });
      });
      
      // Handle broadcast notifications (system-wide) with optimized memory usage
      socket.on('broadcast_notification', (data: Omit<Notification, 'userId'>) => {
        if (!currentUser) return;
        
        // Show toast notification with minimal processing
        toast({
          title: data.title,
          description: data.message,
          variant: 'default',
          duration: 5000
        });
        
        // Debounce the fetch to prevent multiple fetches when receiving batched notifications
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        
        fetchTimeoutRef.current = setTimeout(() => {
          refreshNotifications();
          fetchTimeoutRef.current = null;
        }, FETCH_DELAY);
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
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [currentUser, queryClient, toast, refreshNotifications]);
  
  return (
    <NotificationSocketContext.Provider value={{ isConnected, refreshNotifications }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}