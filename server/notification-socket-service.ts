import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Notification } from '@shared/schema';
import { createAdapter } from '@socket.io/redis-adapter';
import { LRUCache } from 'lru-cache';

// Enhanced user tracking with more efficient data structures
type UserSocketMap = {
  [userId: number]: Set<string>; // Using string for socket IDs to save memory
};

export class NotificationSocketService {
  private io: Server;
  // More efficient user tracking with direct object lookup instead of Map
  private connectedUsers: UserSocketMap = {};
  // Add notification batching and caching for high-performance
  private notificationBatchQueue: Map<number, Notification[]> = new Map();
  // Cache recent notifications to prevent duplicates (LRU cache with max 1000 items)
  private recentNotificationsCache = new LRUCache<string, boolean>({ 
    max: 1000,
    ttl: 1000 * 60 * 5 // 5 minutes
  });
  // Track performance metrics
  private metrics = {
    notificationsSent: 0,
    notificationsDelivered: 0,
    broadcastsSent: 0,
    connectionsHandled: 0,
    disconnectsHandled: 0,
    batchesProcessed: 0
  };
  // Batch processing timer
  private batchProcessingInterval: NodeJS.Timeout | null = null;
  // Connection throttling map
  private connectionThrottleMap = new Map<string, number>();

  constructor(httpServer: HTTPServer) {
    // Create a namespace for notifications with optimized settings
    this.io = new Server(httpServer, {
      // Increase performance with binary transport where available
      transports: ['websocket', 'polling'],
      // Prefer WebSocket for better performance
      allowUpgrades: true, 
      // Reduce polling duration to save resources
      pingInterval: 20000,
      pingTimeout: 10000,
      // Compression saves bandwidth
      perMessageDeflate: true,
      // Higher connection timeout is more efficient for unreliable networks
      connectTimeout: 30000,
      // Limit max payload size to prevent abuse
      maxHttpBufferSize: 1e6
    });

    // Initialize notification namespace
    const notificationNamespace = this.io.of('/notifications');

    // Setup connection handling with rate limiting
    notificationNamespace.on('connection', (socket) => {
      const userId = this.getUserIdFromSocket(socket);
      const clientIp = socket.handshake.address;
      
      // Rate limiting for connections to prevent DoS
      if (this.shouldThrottleConnection(clientIp)) {
        console.log(`[NotificationSocket] Connection throttled for IP: ${clientIp}`);
        socket.disconnect();
        return;
      }
      
      if (!userId) {
        socket.disconnect();
        return;
      }

      // Track metrics
      this.metrics.connectionsHandled++;
      
      // Add to room based on userId for more efficient delivery
      socket.join(`user:${userId}`);
      
      // Register socket with minimal logging
      this.registerUserSocket(userId, socket.id);

      // Handle disconnection efficiently
      socket.on('disconnect', () => {
        this.metrics.disconnectsHandled++;
        socket.leave(`user:${userId}`);
        this.removeUserSocket(userId, socket.id);
      });
      
      // Handle explicit presence update to save resources on auto-detection
      socket.on('presence', (status: { online: boolean }) => {
        // Handle presence changes if needed
      });
      
      // Ping endpoint for client to check connection health instead of constant polling
      socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
          callback({
            status: 'connected',
            timestamp: Date.now()
          });
        }
      });
    });
    
    // Start batch processing timer
    this.startBatchProcessing();
  }

  /**
   * Rate limiting for connections
   */
  private shouldThrottleConnection(clientIp: string): boolean {
    const now = Date.now();
    const lastConnection = this.connectionThrottleMap.get(clientIp) || 0;
    
    // Allow only 1 connection per second per IP
    if (now - lastConnection < 1000) {
      return true;
    }
    
    this.connectionThrottleMap.set(clientIp, now);
    
    // Clean up old entries every 100 connections
    if (this.connectionThrottleMap.size > 1000) {
      const cutoff = now - 60000; // 1 minute
      for (const [ip, timestamp] of this.connectionThrottleMap.entries()) {
        if (timestamp < cutoff) {
          this.connectionThrottleMap.delete(ip);
        }
      }
    }
    
    return false;
  }

  /**
   * Start batch processing for notifications
   * This dramatically reduces server load under high notification volume
   */
  private startBatchProcessing(): void {
    // Process batches every 100ms (balances real-time needs with server load)
    this.batchProcessingInterval = setInterval(() => {
      if (this.notificationBatchQueue.size === 0) return;
      
      this.metrics.batchesProcessed++;
      
      // Process each user's notifications in a batch for efficiency
      for (const [userId, notifications] of this.notificationBatchQueue.entries()) {
        if (notifications.length === 0) continue;
        
        // Send as a batch to each user for better network efficiency
        this.deliverBatchToUser(userId, notifications);
        
        // Clear the batch
        this.notificationBatchQueue.delete(userId);
      }
    }, 100);
  }
  
  /**
   * Deliver batched notifications to user
   */
  private deliverBatchToUser(userId: number, notifications: Notification[]): void {
    const namespace = this.io.of('/notifications');
    // Use room-based delivery for efficiency
    namespace.to(`user:${userId}`).emit('notifications_batch', notifications);
  }

  /**
   * Send a notification to a specific user - now with batching for efficiency
   */
  public sendNotificationToUser(userId: number, notification: Notification): boolean {
    // Track metrics
    this.metrics.notificationsSent++;
    
    // Add deduplication to save processing resources
    const notificationKey = `${userId}:${notification.id || Date.now()}`;
    if (this.recentNotificationsCache.get(notificationKey)) {
      return true; // Already sent, avoid duplicate
    }
    this.recentNotificationsCache.set(notificationKey, true);
    
    // Check if user is connected
    const room = this.io.of('/notifications').adapter.rooms.get(`user:${userId}`);
    const isUserConnected = !!room && room.size > 0;
    
    if (!isUserConnected) {
      return false;
    }
    
    // Add to batch for efficient delivery
    if (!this.notificationBatchQueue.has(userId)) {
      this.notificationBatchQueue.set(userId, []);
    }
    this.notificationBatchQueue.get(userId)?.push(notification);
    
    // For immediate delivery of important notifications
    if (notification.type === 'alert' || notification.type === 'critical') {
      this.io.of('/notifications').to(`user:${userId}`).emit('new_notification', notification);
    }
    
    this.metrics.notificationsDelivered++;
    return true;
  }

  /**
   * Broadcast a notification to all connected users - now with chunking for scale
   */
  public broadcastNotification(notification: Omit<Notification, 'userId'>): void {
    this.metrics.broadcastsSent++;
    
    const namespace = this.io.of('/notifications');
    const roomSizeLimit = 1000; // Process in chunks of 1000 clients for efficiency
    
    // For large deployments with many connected clients
    if (namespace.sockets.size > roomSizeLimit) {
      // Process in chunks to avoid blocking the event loop
      const chunkAndBroadcast = async () => {
        const socketIds = Array.from(namespace.sockets.keys());
        const chunks = [];
        
        for (let i = 0; i < socketIds.length; i += roomSizeLimit) {
          chunks.push(socketIds.slice(i, i + roomSizeLimit));
        }
        
        for (const chunk of chunks) {
          // Process each chunk
          for (const socketId of chunk) {
            const socket = namespace.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit('broadcast_notification', notification);
            }
          }
          // Yield to event loop between chunks
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      };
      
      chunkAndBroadcast().catch(err => {
        console.error('[NotificationSocket] Error in chunked broadcast:', err);
      });
    } else {
      // For smaller deployments, use standard broadcast
      namespace.emit('broadcast_notification', notification);
    }
  }

  /**
   * Extract user ID from socket authentication data - optimized with caching
   */
  private getUserIdFromSocket(socket: any): number | null {
    // Cache user ID in socket to avoid repeated parsing
    if (socket._userId !== undefined) {
      return socket._userId;
    }
    
    try {
      // Use either JWT data or session data
      if (socket.handshake.auth && socket.handshake.auth.token) {
        // Token-based auth
        const token = socket.handshake.auth.token;
        const tokenParts = token.split('.');
        
        if (tokenParts.length !== 3) {
          socket._userId = null;
          return null;
        }
        
        // More efficient token parsing with error handling
        try {
          const payload = tokenParts[1];
          const payloadBuffer = Buffer.from(payload, 'base64');
          const tokenData = JSON.parse(payloadBuffer.toString());
          socket._userId = tokenData.id || null;
          return socket._userId;
        } catch {
          socket._userId = null;
          return null;
        }
      } else if (socket.request.session && socket.request.session.passport) {
        // Session-based auth
        socket._userId = socket.request.session.passport.user || null;
        return socket._userId;
      }
    } catch (e) {
      console.error('[NotificationSocket] Error in auth:', e);
    }
    
    socket._userId = null;
    return null;
  }

  /**
   * Register a socket for a user - more memory efficient implementation
   */
  private registerUserSocket(userId: number, socketId: string): void {
    if (!this.connectedUsers[userId]) {
      this.connectedUsers[userId] = new Set();
    }
    this.connectedUsers[userId].add(socketId);
  }

  /**
   * Remove a socket for a user - optimized for minimal memory usage
   */
  private removeUserSocket(userId: number, socketId: string): void {
    if (this.connectedUsers[userId]) {
      this.connectedUsers[userId].delete(socketId);
      if (this.connectedUsers[userId].size === 0) {
        delete this.connectedUsers[userId];
      }
    }
  }
  
  /**
   * Get current metrics for monitoring
   */
  public getMetrics(): any {
    return {
      ...this.metrics,
      connectedUsers: Object.keys(this.connectedUsers).length,
      totalConnections: Object.values(this.connectedUsers).reduce((sum, set) => sum + set.size, 0),
      queueSize: this.notificationBatchQueue.size,
      cacheSize: this.recentNotificationsCache.size,
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Graceful shutdown to prevent resource leaks
   */
  public shutdown(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
    }
    
    this.io.of('/notifications').disconnectSockets(true);
  }
}

// Singleton instance with cleanup support
let notificationService: NotificationSocketService | null = null;

/**
 * Initialize the notification socket service with performance optimizations
 */
export function initializeNotificationSocketService(httpServer: HTTPServer): NotificationSocketService {
  if (!notificationService) {
    notificationService = new NotificationSocketService(httpServer);
    console.log('[NotificationSocketService] Initialized with performance optimizations');
    
    // Clean exit handling to prevent memory leaks
    process.on('SIGTERM', () => {
      if (notificationService) {
        notificationService.shutdown();
      }
    });
    
    process.on('SIGINT', () => {
      if (notificationService) {
        notificationService.shutdown();
      }
    });
  }
  return notificationService;
}

/**
 * Get the notification socket service instance
 */
export function getNotificationSocketService(): NotificationSocketService | null {
  return notificationService;
}