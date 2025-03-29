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

// Define tracking interface for messages
interface MessageTracking {
  id: string;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: Date;
  status: MessageStatus;
}

export function setupSocketIOServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'] // Enable fallback to polling if WebSocket fails
  });

  // Map to track user connections and message delivery status
  const userConnections = new Map<number, Set<Socket>>();
  const messageTrackingMap = new Map<string, MessageTracking>();
  const typingUsers = new Map<number, Set<number>>();
  
  // Rate limiting for real-time messages
  interface RateLimit {
    count: number;
    resetTime: number;
  }
  const messageLimits = new Map<number, RateLimit>();

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
    
    // Mark user as online in the status tracking service
    markUserOnline(userId, socket.id);
    
    // Mark messages as delivered if any pending
    deliverPendingMessages(userId);

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
        
        // Check rate limit
        if (!checkMessageRateLimit(userId)) {
          socket.emit('error', { 
            message: 'Rate limit exceeded. Please wait before sending more messages.',
            code: 'RATE_LIMIT_EXCEEDED'
          });
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
        
        // Parse content for moderation checks
        let contentForCheck = '';
        let parsedContent;
        
        try {
          // Try to parse content as JSON
          parsedContent = typeof content === 'object' ? content : JSON.parse(content);
          // Extract text for moderation check
          contentForCheck = parsedContent.text || '';
        } catch (e) {
          // If parsing fails, use the raw content for checking
          contentForCheck = content;
        }
        
        log(`Message from user ${userId} to ${receiverId}: ${contentForCheck.substring(0, 50)}${contentForCheck.length > 50 ? '...' : ''}`);
        
        // Check message content for prohibited words
        const contentCheck = checkMessageContent(contentForCheck);
        
        // Create message in database
        const message = await storage.createUserMessage({
          senderId: userId,
          receiverId,
          content, // Store original content (may be JSON or plain text)
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
              contentForCheck, // Use the text content for moderation
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

        // Track this message for delivery status
        const trackingId = `msg_${message.id}`;
        messageTrackingMap.set(trackingId, {
          id: trackingId,
          senderId: userId,
          receiverId,
          content,
          timestamp: new Date(message.timestamp),
          status: 'sent'
        });
        
        // Send to sender for immediate display
        emitToUser(userId, 'new_message', { message });
        
        // Try to deliver to receiver
        const isDelivered = emitToUser(receiverId, 'new_message', { message });
        
        if (isDelivered) {
          // Update status to delivered
          await storage.updateMessageStatus(message.id, 'delivered');
          messageTrackingMap.get(trackingId)!.status = 'delivered';
          
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
        // Get user messages with a large limit to find the specific message
        // The second parameter is otherUserId, but we pass 0 as a placeholder since we're looking for a message by ID
        const allMessagesResult = await storage.getUserMessages(userId, 0, { page: 1, limit: 1000 });
        // Now we need to find the message in the messages array
        const message = allMessagesResult.messages.find(m => m.id === messageId);
        
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
        
        // Update tracking map
        const trackingId = `msg_${messageId}`;
        if (messageTrackingMap.has(trackingId)) {
          messageTrackingMap.get(trackingId)!.status = status;
        }
        
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
        
        // Use a simplified rate limit for typing indicators (100 per minute)
        // We don't need to be as strict since these are short-lived events
        const now = Date.now();
        const typingLimit = 100; // Higher limit for typing indicators
        
        // Check and update typing rate limit
        let typingRateLimit = messageLimits.get(userId * -1); // Use negative ID to separate from normal messages
        if (!typingRateLimit || typingRateLimit.resetTime <= now) {
          typingRateLimit = {
            count: 0,
            resetTime: now + 60000 // 1 minute reset
          };
        }
        
        typingRateLimit.count++;
        messageLimits.set(userId * -1, typingRateLimit);
        
        // Skip if exceeding limit
        if (typingRateLimit.count > typingLimit) {
          return; // Silently drop excessive typing indicators
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

  // Helper function to deliver any pending messages to a user
  function deliverPendingMessages(userId: number) {
    let delivered = false;
    // Check message tracking map for any undelivered messages
    Array.from(messageTrackingMap.entries()).forEach(([trackingId, messageData]) => {
      if (messageData.receiverId === userId && messageData.status === 'sent') {
        // Attempt to deliver the message
        const isDelivered = emitToUser(userId, 'new_message', {
          message: {
            id: parseInt(trackingId.replace('msg_', '')),
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            content: messageData.content,
            timestamp: messageData.timestamp,
            status: 'delivered'
          }
        });
        
        if (isDelivered) {
          delivered = true;
          messageData.status = 'delivered';
          
          // Update in database
          storage.updateMessageStatus(parseInt(trackingId.replace('msg_', '')), 'delivered')
            .catch(err => log(`Error updating message status: ${err}`));
          
          // Notify sender of delivery
          emitToUser(messageData.senderId, 'message_status', {
            messageId: parseInt(trackingId.replace('msg_', '')),
            status: 'delivered'
          });
        }
      }
    });
    
    // Clean up old tracking entries
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    Array.from(messageTrackingMap.entries()).forEach(([trackingId, messageData]) => {
      if (now - messageData.timestamp.getTime() > ONE_DAY) {
        messageTrackingMap.delete(trackingId);
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

  // Helper function to check rate limits
  function checkMessageRateLimit(userId: number): boolean {
    const now = Date.now();
    const maxMessages = 30; // Maximum messages per minute
    const resetTime = 60000; // 1 minute in ms
    
    // Get or create rate limit for this user
    let rateLimit = messageLimits.get(userId);
    if (!rateLimit || rateLimit.resetTime <= now) {
      // Create a new rate limit if none exists or the existing one has expired
      rateLimit = {
        count: 0,
        resetTime: now + resetTime
      };
    }
    
    // Increment count
    rateLimit.count++;
    messageLimits.set(userId, rateLimit);
    
    // Check if limit is exceeded
    if (rateLimit.count > maxMessages) {
      log(`User ${userId} exceeded message rate limit (${rateLimit.count}/${maxMessages})`);
      return false; // Exceeds limit
    }
    
    return true; // Within limit
  }

  // Set up maintenance interval
  setInterval(() => {
    // Clean up expired message tracking
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    Array.from(messageTrackingMap.entries()).forEach(([trackingId, messageData]) => {
      if (now - messageData.timestamp.getTime() > ONE_DAY) {
        messageTrackingMap.delete(trackingId);
      }
    });
    
    // Clean up expired rate limits
    Array.from(messageLimits.entries()).forEach(([userId, rateLimit]) => {
      if (rateLimit.resetTime <= now) {
        messageLimits.delete(userId);
      }
    });
    
    // Clean up inactive user status tracking
    cleanupInactiveUsers();
  }, 60 * 60 * 1000); // Run every hour

  return io;
}