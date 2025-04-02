import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Notification } from '@shared/schema';

// Keep track of connected users and their sockets - optimized structure
type ConnectedUsers = Map<number, Set<string>>;

// Cache control constants
const SOCKET_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'info';
const MAX_RECONNECTION_ATTEMPTS = 3;
const PING_TIMEOUT = 20000; // 20 seconds
const PING_INTERVAL = 25000; // 25 seconds

export class NotificationSocketService {
  private io: Server;
  private connectedUsers: ConnectedUsers = new Map();
  // Add debounce tracking for logging
  private lastLogTime: Map<string, number> = new Map();

  constructor(httpServer: HTTPServer) {
    // Create a namespace for notifications with optimized configuration
    this.io = new Server(httpServer, {
      serveClient: false, // Don't serve client files
      pingTimeout: PING_TIMEOUT, 
      pingInterval: PING_INTERVAL,
      connectTimeout: 15000,
      transports: ['websocket'], // Only use WebSocket, avoid long-polling
      allowUpgrades: false, // Disable transport upgrades
      maxHttpBufferSize: 1e6, // 1MB max payload
      cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    const notificationNamespace = this.io.of('/notifications');

    notificationNamespace.on('connection', (socket) => {
      const userId = this.getUserIdFromSocket(socket);
      
      if (!userId) {
        this.debouncedLog('socket-error', `[NotificationSocket] Connection rejected - no user ID`);
        socket.disconnect();
        return;
      }

      this.debouncedLog(`user-${userId}`, `[NotificationSocket] User ${userId} connected`);
      
      // Register this socket with the user
      this.registerUserSocket(userId, socket.id);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.debouncedLog(`user-${userId}`, `[NotificationSocket] User ${userId} disconnected`);
        this.removeUserSocket(userId, socket.id);
      });
    });
  }

  /**
   * Send a notification to a specific user - optimized for performance
   */
  public sendNotificationToUser(userId: number, notification: Notification): boolean {
    // Get all socket IDs for this user
    const socketIds = this.connectedUsers.get(userId);
    if (!socketIds || socketIds.size === 0) {
      return false; // Silently fail without logging to reduce overhead
    }

    // Prepare a minimal notification object by removing unnecessary properties
    const minimalNotification = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt
    };

    // Send notification to all connected devices of this user
    const namespace = this.io.of('/notifications');
    let delivered = false;
    
    // Use for...of loop instead of forEach for better performance with early return
    for (const socketId of socketIds) {
      const socket = namespace.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit('new_notification', minimalNotification);
        delivered = true;
        // Skip individual delivery logs to reduce overhead
        break; // Only need one successful delivery to mark as delivered
      }
    }

    return delivered;
  }

  /**
   * Broadcast a notification to all connected users - optimized
   */
  public broadcastNotification(notification: Omit<Notification, 'userId'>): void {
    // Create a minimal payload
    const minimalNotification = {
      type: notification.type,
      title: notification.title,
      message: notification.message
    };
    
    const namespace = this.io.of('/notifications');
    namespace.emit('broadcast_notification', minimalNotification);
    this.debouncedLog('broadcast', `[NotificationSocket] Broadcast notification sent`);
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
  
  /**
   * Debounced logging to reduce log volume
   * Only logs once per key per 10 seconds
   */
  private debouncedLog(key: string, message: string): void {
    const now = Date.now();
    const lastTime = this.lastLogTime.get(key) || 0;
    
    // Only log if it's been more than 10 seconds since the last log with this key
    if (now - lastTime > 10000) {
      if (SOCKET_LOG_LEVEL === 'info') {
        console.log(message);
      } else if (SOCKET_LOG_LEVEL === 'error' && message.includes('error')) {
        console.error(message);
      }
      this.lastLogTime.set(key, now);
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