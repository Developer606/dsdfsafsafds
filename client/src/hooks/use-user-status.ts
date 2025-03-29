import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket-io-client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage and track user online status
 * @param userId The user ID to track
 * @returns An object containing the user's online status and last active time
 */
export function useUserStatus(userId: number | null) {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastActive, setLastActive] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const socketManager = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Initial status fetch
    const fetchStatus = async () => {
      try {
        // Debug: Always connect socket when checking status
        if (!socketManager.isConnected()) {
          socketManager.connect();
        }
        
        const response = await fetch(`/api/users/status/${userId}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[Status] User ${userId} online status:`, data);
          
          // Force online status for testing
          setIsOnline(true);
          setLastActive(data.lastActive ? new Date(data.lastActive) : new Date());
          
          // Show debug toast
          toast({
            title: "Debug: User Status",
            description: `User ${userId} is now shown as online for testing purposes.`,
            duration: 2000
          });
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Socket event handler for status updates
    const handleStatusUpdate = (data: any) => {
      if (data.userId === userId) {
        setIsOnline(data.online);
        if (data.lastActive) {
          setLastActive(new Date(data.lastActive));
        }
      }
    };

    // Listen for user status updates via socket
    const removeListener = socketManager.addEventListener('user_status_update', handleStatusUpdate);

    // Set up a periodic refresh for the status (every 30 seconds)
    const statusInterval = setInterval(fetchStatus, 30000);

    // Cleanup
    return () => {
      removeListener();
      clearInterval(statusInterval);
    };
  }, [userId, socketManager]);

  /**
   * Format the last active time into a human-readable string
   */
  const formatLastActive = (): string => {
    if (!lastActive) return "Unknown";
    
    const now = new Date();
    const diff = now.getTime() - lastActive.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return "Just now";
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // More than a day
    const days = Math.floor(diff / 86400000);
    if (days === 1) {
      return "Yesterday";
    }
    
    return `${days} days ago`;
  };

  return {
    isOnline,
    lastActive,
    lastActiveFormatted: formatLastActive(),
    isLoading
  };
}