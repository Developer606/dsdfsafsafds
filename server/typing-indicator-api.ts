import express from 'express';
import { WebSocket } from 'ws';

// Export a function to add the typing indicator routes to an existing Express app
export function addTypingIndicatorRoutes(
  app: express.Express, 
  userConnections: Map<number, Set<WebSocket>>,
  rateLimiter: (limit: number, windowMs: number) => express.RequestHandler
) {
  // Map to track typing users
  const typingUsersMap = new Map<number, Set<number>>();

  // REST API endpoint for typing indicators (fallback when Socket.IO fails)
  app.post("/api/typing-indicator", rateLimiter(100, 60000), async (req, res) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    try {
      const { senderId, receiverId, isTyping } = req.body;
      
      // Security: Ensure the senderId matches the authenticated user
      if (req.user?.id !== senderId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Sender ID does not match authenticated user' 
        });
      }
      
      if (!receiverId || typeof isTyping !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request parameters' 
        });
      }
      
      // Get the user connections for the receiver
      const receiverConnections = userConnections.get(receiverId);
      
      // Notify all of the receiver's connected clients
      if (receiverConnections && receiverConnections.size > 0) {
        // Create the notification data
        const data = {
          type: 'typing_indicator',
          senderId: senderId,
          isTyping: isTyping
        };
        
        const message = JSON.stringify(data);
        
        // Notify each connection
        let notifiedCount = 0;
        for (const client of receiverConnections) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            notifiedCount++;
          }
        }
        
        // Store typing status
        if (isTyping) {
          // Add to typing users map
          if (!typingUsersMap.has(receiverId)) {
            typingUsersMap.set(receiverId, new Set());
          }
          typingUsersMap.get(receiverId)?.add(senderId);
        } else {
          // Remove from typing users map
          typingUsersMap.get(receiverId)?.delete(senderId);
        }
        
        return res.json({ success: true, notifiedClients: notifiedCount });
      } else {
        // No connected clients to notify, but operation is still successful
        return res.json({ success: true, notifiedClients: 0 });
      }
    } catch (err) {
      console.error('Error in typing indicator REST endpoint:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });
  
  // Return the typing users map for external access if needed
  return typingUsersMap;
}