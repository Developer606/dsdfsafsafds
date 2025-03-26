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
          queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
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
