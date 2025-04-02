import { queryClient } from "./queryClient";

export const setupWebSocket = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket received message:", data);
      
      // Handle different types of updates
      switch (data.type) {
        // Admin updates
        case 'user_update':
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
          break;
        case 'message_update':
          queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/recent"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/messages"] });
          break;
        case 'character_update':
          queryClient.invalidateQueries({ queryKey: ["/api/admin/characters/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/characters/popularity"] });
          break;
        case 'subscription_update':
          queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
          break;
        case 'notification_update':
          console.log("Received notification_update via WebSocket");
          
          // For user notifications, use a more direct approach
          const fetchFreshNotifications = async () => {
            try {
              // Wait a brief moment for the server to finish processing
              await new Promise(resolve => setTimeout(resolve, 300));
              
              console.log("Fetching fresh notifications from server after WebSocket update");
              const response = await fetch('/api/notifications', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (!response.ok) {
                console.error("Error fetching notifications:", response.status);
                throw new Error('Failed to fetch notifications');
              }
              
              const freshNotifications = await response.json();
              console.log(`Received ${freshNotifications.length} fresh notifications`);
              
              // Update the cache directly with fresh data
              queryClient.setQueryData(['/api/notifications'], freshNotifications);
            } catch (error) {
              console.error("Error fetching fresh notifications, falling back to cache invalidation:", error);
              // Fallback to invalidation on error
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            }
          };
          
          // For admin notifications, still use invalidation as it's less critical for real-time
          queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
          
          // Execute the fetch
          fetchFreshNotifications();
          break;
          
        // User messaging updates
        case 'new_message':
          // Handle new message notification
          if (data.message) {
            // Invalidate conversation list
            queryClient.invalidateQueries({ queryKey: ["/api/user/conversations"] });
            
            // Invalidate specific conversation messages
            const otherUserId = data.message.senderId;
            queryClient.invalidateQueries({ queryKey: ["/api/user-messages", otherUserId] });
          }
          break;
          
        case 'message_sent':
          // Message sent confirmation
          if (data.messageId) {
            queryClient.invalidateQueries({ queryKey: ["/api/user-messages"] });
          }
          break;
          
        case 'message_status_update':
          // Message status update
          if (data.messageId) {
            queryClient.invalidateQueries({ queryKey: ["/api/user-messages"] });
          }
          break;
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  };

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    // Attempt to reconnect after 5 seconds
    setTimeout(() => setupWebSocket(), 5000);
  };

  return socket;
};
