import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { storage } from './storage';
import { MessageStatus } from '@shared/schema';
import { 
  markUserOnline, 
  markUserOffline, 
  updateUserActivity,
  cleanupInactiveUsers
} from './services/user-status';
import { verifyToken } from './utils/jwt';
import { 
  checkMessageContent, 
  flagMessage 
} from './content-moderation';

// Socket performance configuration
const SOCKET_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'info';
const PING_TIMEOUT = 20000; // 20 seconds
const PING_INTERVAL = 25000; // 25 seconds
const MAX_RECONNECTION_ATTEMPTS = 3;

// Memory usage optimization constants
const MEMORY_CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const INACTIVE_USER_THRESHOLD = 30 * 60 * 1000; // 30 minutes

// Debouncing mechanism for log reduction
const lastLogTime = new Map<string, number>();

/**
 * Debounced logging to reduce log volume and memory pressure
 */
function debouncedLog(key: string, message: string, level: 'info' | 'error' = 'info'): void {
  const now = Date.now();
  const lastTime = lastLogTime.get(key) || 0;
  
  // Only log if it's been more than 10 seconds since the last log with this key
  if (now - lastTime > 10000) {
    if (level === 'info' && SOCKET_LOG_LEVEL === 'info') {
      console.log(message);
    } else if (level === 'error') {
      console.error(message);
    }
    lastLogTime.set(key, now);
  }
}

/**
 * Socket service for centralized access to the Socket.IO instance
 */
class SocketService {
  public io: Server | null = null;
  
  /**
   * Get the Socket.IO instance
   */
  getIO(): Server {
    if (!this.io) {
      throw new Error('Socket.IO has not been initialized');
    }
    return this.io;
  }
  
  /**
   * Initialize the Socket.IO instance
   */
  initialize(io: Server): void {
    this.io = io;
  }
}

// Export a singleton instance
export const socketService = new SocketService();

/**
 * Set up optimized Socket.IO server with reduced memory footprint
 * @param httpServer HTTP server to attach to
 * @param handleWebSocketTraffic Whether to also handle WebSocket traffic (instead of using a separate server)
 */
export function setupSocketIOServer(httpServer: HTTPServer, handleWebSocketTraffic = false) {
  // Optimized Socket.IO configuration
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: handleWebSocketTraffic ? ['websocket'] : ['websocket', 'polling'],
    pingTimeout: PING_TIMEOUT,
    pingInterval: PING_INTERVAL,
    connectTimeout: 15000,
    maxHttpBufferSize: 1e6, // 1MB limit to prevent memory issues
    allowUpgrades: !handleWebSocketTraffic, // Disable upgrades if only using WebSocket
    serveClient: false // Don't serve client files for better performance
  });

  // Memory-optimized connection tracking
  const userConnections = new Map<number, Set<Socket>>();
  const typingUsers = new Map<number, Set<number>>();
  
  // Set up periodic memory cleanup for inactive connections
  setInterval(() => {
    // Clear old logging timestamps to prevent memory leaks
    const now = Date.now();
    lastLogTime.forEach((timestamp, key) => {
      if (now - timestamp > 3600000) { // 1 hour
        lastLogTime.delete(key);
      }
    });
    
    // Remove inactive users from tracking
    cleanupInactiveUsers(INACTIVE_USER_THRESHOLD);
    
    // Clear any empty sets
    userConnections.forEach((connections, userId) => {
      if (connections.size === 0) {
        userConnections.delete(userId);
      }
    });
    
    typingUsers.forEach((users, conversationId) => {
      if (users.size === 0) {
        typingUsers.delete(conversationId);
      }
    });
  }, MEMORY_CLEANUP_INTERVAL);
  
  // Wrapper for console.log with socket.io prefix
  const log = (message: string) => {
    console.log(`[socket.io] ${message}`);
  };

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      // Get token from auth data (preferred) or fallback to sessionId for backward compatibility
      const token = socket.handshake.auth.token;
      const sessionId = socket.handshake.auth.sessionId;
      
      // First attempt JWT authentication
      if (token) {
        // Verify the JWT token
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          // Store user ID in socket for later use
          socket.data.userId = decoded.id;
          socket.data.authMethod = 'jwt';
          log(`JWT authenticated connection for user ${socket.data.userId}`);
          return next();
        } else {
          log(`Connection rejected - invalid JWT token`);
        }
      }
      
      // Fallback to session-based authentication
      if (sessionId) {
        // Verify session exists and contains user
        const parsedSessionId = decodeURIComponent(sessionId).replace('s:', '').split('.')[0];
        
        const sessionData: any = await new Promise((resolve, reject) => {
          storage.sessionStore.get(parsedSessionId, (err, session) => {
            if (err) reject(err);
            else resolve(session);
          });
        });

        if (sessionData?.passport?.user) {
          // Store user ID in socket for later use
          socket.data.userId = sessionData.passport.user;
          socket.data.authMethod = 'session';
          log(`Session authenticated connection for user ${socket.data.userId}`);
          return next();
        } else {
          log(`Connection rejected - invalid session: ${parsedSessionId}`);
        }
      }
      
      // If we reach here, both authentication methods failed
      log(`Connection rejected - no valid authentication`);
      next(new Error('Authentication required'));
    } catch (error) {
      log(`Error during authentication: ${error}`);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }
    
    log(`User ${userId} connected`);
    
    // Register connection in map
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)?.add(socket);
    
    // Join user-specific room for receiving character messages
    socket.join(`user_${userId}`);
    
    // Mark user as online in the status tracking service
    markUserOnline(userId, socket.id);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      log(`User ${userId} disconnected: ${reason}`);
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
          
          // Mark user as offline in the status tracking service
          markUserOffline(userId);
          
          // Clear typing indicators when user disconnects
          typingUsers.delete(userId);
          
          // Notify all users who this user was typing to
          Array.from(typingUsers.entries()).forEach(([receiverId, senderSet]) => {
            if (senderSet.has(userId)) {
              senderSet.delete(userId);
              notifyTypingStatus(receiverId, userId, false);
            }
          });
        }
      }
    });

    // Ping to keep connection alive
    socket.on('pong', () => {
      // socket is alive, do nothing
    });

    // Handle user-to-user messages
    socket.on('user_message', async (data) => {
      try {
        const { receiverId, content } = data;
        if (!receiverId || !content) {
          log(`Invalid message format: ${JSON.stringify(data)}`);
          return;
        }
        
        // Check if the conversation is blocked
        const minUserId = Math.min(userId, receiverId);
        const maxUserId = Math.max(userId, receiverId);
        const conversation = await storage.getConversationBetweenUsers(minUserId, maxUserId);
        
        if (conversation?.isBlocked) {
          socket.emit('error', { 
            message: 'This conversation has been blocked by a moderator for violating community guidelines.',
            code: 'CONVERSATION_BLOCKED'
          });
          return;
        }
        
        // Update user's last activity timestamp
        updateUserActivity(userId);
        
        log(`Message from user ${userId} to ${receiverId}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        
        // Check message content for prohibited words
        const contentCheck = checkMessageContent(content);
        
        // Create message in database
        const message = await storage.createUserMessage({
          senderId: userId,
          receiverId,
          content,
          status: 'sent'
        });
        
        // If flagged, handle content moderation
        if (contentCheck.flagged) {
          log(`FLAGGED MESSAGE from user ${userId}: ${contentCheck.reason}`);
          
          // Flag the message in the moderation system
          try {
            await flagMessage(
              message.id,
              userId,
              receiverId,
              content,
              contentCheck.reason || 'Prohibited content'
            );
            
            // Notify admins about flagged content (if they're online)
            const adminUsers = await storage.getAllUsers().then(users => 
              users.filter(user => user.isAdmin));
            
            adminUsers.forEach(admin => {
              emitToUser(admin.id, 'admin_notification', {
                type: 'flagged_message',
                message: `Message from user ${userId} was flagged: ${contentCheck.reason}`,
                timestamp: new Date(),
                messageId: message.id
              });
            });
          } catch (err) {
            log(`Error flagging message: ${err}`);
          }
        }
        
        // Make sure we have the message object before proceeding
        if (!message) {
          log('Error: Message object is undefined');
          socket.emit('error', { message: 'Failed to create message' });
          return;
        }
        
        // Send to sender for immediate display
        emitToUser(userId, 'new_message', { message });
        
        // Try to deliver to receiver
        const isDelivered = emitToUser(receiverId, 'new_message', { message });
        
        if (isDelivered) {
          // Update status to delivered
          await storage.updateMessageStatus(message.id, 'delivered');
          
          // Notify sender of delivery
          emitToUser(userId, 'message_status', {
            messageId: message.id,
            status: 'delivered'
          });
        }
        
        // Confirm receipt to sender
        socket.emit('message_sent', {
          messageId: message.id,
          status: isDelivered ? 'delivered' : 'sent'
        });
      } catch (error) {
        log(`Error handling user message: ${error}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message status updates
    socket.on('message_status_update', async (data) => {
      try {
        const { messageId, status } = data;
        if (!messageId || !status) {
          log(`Invalid message status update: ${JSON.stringify(data)}`);
          return;
        }
        
        log(`Status update for message ${messageId} to ${status} by user ${userId}`);
        
        // Verify this user is the receiver of the message
        const messages = await storage.getUserMessages(userId, 0, { page: 1, limit: 1000 });
        const message = messages.messages.find(m => m.id === messageId);
        
        if (!message) {
          log(`Message ${messageId} not found or user ${userId} is not authorized`);
          return;
        }
        
        if (message.receiverId !== userId) {
          log(`User ${userId} not authorized to update status for message ${messageId}`);
          return;
        }
        
        // Update status in database
        await storage.updateMessageStatus(messageId, status);
        
        // Notify sender of status change
        emitToUser(message.senderId, 'message_status', {
          messageId,
          status
        });
      } catch (error) {
        log(`Error updating message status: ${error}`);
      }
    });

    // Handle typing indicators
    socket.on('typing_indicator', (data) => {
      try {
        const { receiverId, isTyping } = data;
        if (receiverId === undefined || isTyping === undefined) {
          return;
        }
        
        // Update typing status tracking
        if (!typingUsers.has(receiverId)) {
          typingUsers.set(receiverId, new Set());
        }
        
        const typingToReceiver = typingUsers.get(receiverId)!;
        
        if (isTyping) {
          typingToReceiver.add(userId);
        } else {
          typingToReceiver.delete(userId);
        }
        
        // Notify recipient
        notifyTypingStatus(receiverId, userId, isTyping);
      } catch (error) {
        log(`Error handling typing indicator: ${error}`);
      }
    });

    // Handle refresh conversation requests
    socket.on('refresh_conversation', async (data) => {
      try {
        const { otherUserId } = data;
        if (typeof otherUserId !== 'number') {
          log(`Invalid refresh conversation format: ${JSON.stringify(data)}`);
          return;
        }
        
        log(`Refresh conversation request from user ${userId} for conversation with ${otherUserId}`);
        
        // Get the latest conversation status
        const minUserId = Math.min(userId, otherUserId);
        const maxUserId = Math.max(userId, otherUserId);
        const conversation = await storage.getConversationBetweenUsers(minUserId, maxUserId);
        
        // Send conversation status update to the requesting user
        socket.emit('conversation_status_update', {
          otherUserId,
          isBlocked: conversation?.isBlocked || false
        });
        
        // Emit a refresh conversation event to both users
        // This will trigger an immediate UI refresh in the client
        socket.emit('refresh_conversation', { otherUserId });
        emitToUser(otherUserId, 'refresh_conversation', { otherUserId: userId });
        log(`Sent refresh_conversation event to users ${userId} and ${otherUserId}`);
        
        // If the conversation exists and isn't blocked, also refresh messages
        if (conversation && !conversation.isBlocked) {
          const messages = await storage.getUserMessages(userId, otherUserId, { page: 1, limit: 50 });
          socket.emit('messages_refreshed', { messages });
        }
      } catch (error) {
        log(`Error handling refresh conversation: ${error}`);
      }
    });
    
    // Send regular pings to keep connection alive
    const pingInterval = setInterval(() => {
      socket.emit('ping');
    }, 30000);

    socket.on('disconnect', () => {
      clearInterval(pingInterval);
    });
  });

  // Helper function to emit events to all sockets of a user
  function emitToUser(userId: number, event: string, data: any): boolean {
    const userSockets = userConnections.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return false;
    }
    
    let delivered = false;
    userSockets.forEach(socket => {
      if (socket.connected) {
        socket.emit(event, data);
        delivered = true;
      }
    });
    
    return delivered;
  }

  // Helper function to notify about typing status
  function notifyTypingStatus(receiverId: number, senderId: number, isTyping: boolean) {
    emitToUser(receiverId, 'typing_indicator', {
      senderId,
      isTyping
    });
  }

  // Set up maintenance interval for user status cleanup
  setInterval(() => {
    cleanupInactiveUsers(INACTIVE_USER_THRESHOLD);
  }, 60 * 60 * 1000); // Run every hour

  // Initialize the socket service with this io instance
  socketService.initialize(io);
  
  return io;
}
