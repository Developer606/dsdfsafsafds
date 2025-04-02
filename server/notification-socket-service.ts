import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Notification } from '@shared/schema';

// Keep track of connected users and their sockets
type ConnectedUsers = Map<number, Set<string>>;

export class NotificationSocketService {
  private io: Server;
  private connectedUsers: ConnectedUsers = new Map();

  constructor(httpServer: HTTPServer) {
    // Create a namespace for notifications to keep them separate from other socket communications
    this.io = new Server(httpServer);
    const notificationNamespace = this.io.of('/notifications');

    notificationNamespace.on('connection', (socket) => {
      const userId = this.getUserIdFromSocket(socket);
      
      if (!userId) {
        console.log('[NotificationSocket] Connection rejected - no user ID');
        socket.disconnect();
        return;
      }

      console.log(`[NotificationSocket] User ${userId} connected`);
      
      // Register this socket with the user
      this.registerUserSocket(userId, socket.id);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[NotificationSocket] User ${userId} disconnected`);
        this.removeUserSocket(userId, socket.id);
      });
      
      // Handle manual refresh requests from client
      socket.on('request_notifications', async () => {
        console.log(`[NotificationSocket] User ${userId} requested notifications refresh`);
        try {
          // Import storage dynamically to avoid circular dependencies
          const { storage } = await import('./storage');
          
          // Use the same direct database connection method that the API uses
          // for maximum consistency with the standard API
          const { notificationDb } = await import('./notification-db');
          
          // Get the raw notifications through a direct query for the freshest data
          const rawNotifications = await new Promise((resolve, reject) => {
            try {
              const db = notificationDb.$client;
              
              // Use the same query format as the API endpoint
              const query = `
                SELECT 
                  id,
                  user_id as userId,
                  type,
                  title,
                  message,
                  read,
                  created_at as createdAt
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 20
              `;
              
              const stmt = db.prepare(query);
              const results = stmt.all(userId);
              
              resolve(results);
            } catch (err) {
              console.error("Database error in notification socket query:", err);
              reject(err);
            }
          });
            
          // Format the notifications in the same way the API does
          const notifications = (rawNotifications as any[]).map(notification => ({
            ...notification,
            read: Boolean(notification.read),
            createdAt: new Date(notification.createdAt).toISOString()
          }));
          
          // Send the notifications directly to just this specific socket
          socket.emit('notification_refresh', notifications);
          
          console.log(`[NotificationSocket] Sent ${notifications.length} notifications to user ${userId}`);
        } catch (error) {
          console.error(`[NotificationSocket] Error getting notifications for user ${userId}:`, error);
          // Send an empty array if there was an error, to avoid client-side errors
          socket.emit('notification_refresh', []);
        }
      });
    });
  }

  /**
   * Send a notification to a specific user
   */
  public sendNotificationToUser(userId: number, notification: Notification): boolean {
    // Get all socket IDs for this user
    const socketIds = this.connectedUsers.get(userId);
    if (!socketIds || socketIds.size === 0) {
      console.log(`[NotificationSocket] User ${userId} not connected, notification will be seen on next login`);
      return false;
    }

    // Send notification to all connected devices of this user
    const namespace = this.io.of('/notifications');
    let delivered = false;
    
    socketIds.forEach(socketId => {
      const socket = namespace.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit('new_notification', notification);
        delivered = true;
        console.log(`[NotificationSocket] Notification sent to user ${userId} on socket ${socketId}`);
      }
    });

    return delivered;
  }

  /**
   * Broadcast a notification to all connected users
   */
  public broadcastNotification(notification: Omit<Notification, 'userId'>): void {
    const namespace = this.io.of('/notifications');
    namespace.emit('broadcast_notification', notification);
    console.log(`[NotificationSocket] Broadcast notification sent to all users`);
  }

  /**
   * Extract user ID from socket authentication data
   */
  private getUserIdFromSocket(socket: any): number | null {
    // Use either JWT data or session data
    if (socket.handshake.auth && socket.handshake.auth.token) {
      try {
        // This assumes the token is a JWT with a 'userId' field
        const tokenData = JSON.parse(
          Buffer.from(socket.handshake.auth.token.split('.')[1], 'base64').toString()
        );
        return tokenData.id || null;
      } catch (e) {
        console.error('[NotificationSocket] Error parsing token:', e);
        return null;
      }
    } else if (socket.request.session && socket.request.session.passport) {
      return socket.request.session.passport.user || null;
    }
    
    return null;
  }

  /**
   * Register a socket for a user
   */
  private registerUserSocket(userId: number, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)?.add(socketId);
  }

  /**
   * Remove a socket for a user
   */
  private removeUserSocket(userId: number, socketId: string): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }
}

// Singleton instance
let notificationService: NotificationSocketService | null = null;

/**
 * Initialize the notification socket service
 */
export function initializeNotificationSocketService(httpServer: HTTPServer): NotificationSocketService {
  if (!notificationService) {
    notificationService = new NotificationSocketService(httpServer);
    console.log('[NotificationSocketService] Initialized');
  }
  return notificationService;
}

/**
 * Get the notification socket service instance
 */
export function getNotificationSocketService(): NotificationSocketService | null {
  return notificationService;
}