import { queryClient } from "./queryClient";

export const setupWebSocket = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Handle different types of updates
    switch (data.type) {
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
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    // Attempt to reconnect after 5 seconds
    setTimeout(() => setupWebSocket(), 5000);
  };

  return socket;
};
