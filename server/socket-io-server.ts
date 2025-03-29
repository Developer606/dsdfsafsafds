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

    // Handle individual message status updates
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
        const allMessagesResult = await storage.getUserMessages(userId, 0, 1, 1000);
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
    
    // Handle batch message status updates for high throughput optimization
    socket.on('message_status_batch_update', async (data) => {
      try {
        const { messageIds, status } = data;
        if (!Array.isArray(messageIds) || messageIds.length === 0 || !status) {
          log(`Invalid batch message status update: ${JSON.stringify(data)}`);
          return;
        }
        
        log(`Batch status update for ${messageIds.length} messages to "${status}" by user ${userId}`);
        
        // Rate limit check for batch operations (limit to 500 messages per batch)
        const batchSize = Math.min(messageIds.length, 500);
        const processedIds = messageIds.slice(0, batchSize);
        
        // Get all user messages (with limit)
        // Need to verify user has permission to update these messages
        const allMessagesResult = await storage.getUserMessages(userId, 0, 1, 1000);
        
        // Find authorized messages (user must be the receiver)
        const authorizedMessageIds = [];
        const senderMap = new Map<number, number[]>();
        const trackingIds = [];
        
        for (const messageId of processedIds) {
          const message = allMessagesResult.messages.find(m => m.id === messageId);
          if (message && message.receiverId === userId) {
            authorizedMessageIds.push(messageId);
            trackingIds.push(`msg_${messageId}`);
            
            // Group by sender for batched notifications
            if (!senderMap.has(message.senderId)) {
              senderMap.set(message.senderId, []);
            }
            senderMap.get(message.senderId)!.push(messageId);
          }
        }
        
        if (authorizedMessageIds.length === 0) {
          log(`No authorized messages found in batch update request`);
          return;
        }
        
        // Update database in bulk for better performance
        if (storage.updateMessageStatusBulk) {
          await storage.updateMessageStatusBulk(authorizedMessageIds, status)
            .catch(err => log(`Error in bulk update: ${err}`));
        } else {
          // Fallback to individual updates
          for (const messageId of authorizedMessageIds) {
            await storage.updateMessageStatus(messageId, status)
              .catch(err => log(`Error updating message ${messageId}: ${err}`));
          }
        }
        
        // Update tracking map for all messages
        for (const trackingId of trackingIds) {
          if (messageTrackingMap.has(trackingId)) {
            messageTrackingMap.get(trackingId)!.status = status;
          }
        }
        
        // Send batch notifications to each sender
        senderMap.forEach((ids, senderId) => {
          emitToUser(senderId, 'message_status_batch', {
            messageIds: ids,
            status
          });
        });
        
        log(`Successfully processed batch status update for ${authorizedMessageIds.length} messages`);
      } catch (error) {
        log(`Error in batch message status update: ${error}`);
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

  // Helper function to emit events to all sockets of a user with optimization for high throughput
  function emitToUser(userId: number, event: string, data: any): boolean {
    const userSockets = userConnections.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return false;
    }
    
    // For high throughput optimization, batch client notifications and limit payload size
    
    // Clone data to avoid reference issues and implement data size optimization
    let optimizedData = data;
    
    // If we're sending a message that contains large content, truncate preview for efficiency
    if (event === 'new_message' && data.message && data.message.content) {
      // Only truncate if content is over 1KB (optimization for large messages)
      if (data.message.content.length > 1024) {
        // Create a shallow clone of the message object
        optimizedData = {
          ...data,
          message: {
            ...data.message,
            // For long content, store full content in .fullContent and truncate .content
            // This preserves ability to display preview while reducing socket payload
            fullContent: undefined, // Don't send duplicate data
            content: data.message.content.substring(0, 1024) + '...'
          }
        };
      }
    }
    
    // Optimization: Only emit to the first connected socket to reduce duplicate processing
    // This is sufficient for delivery status tracking
    for (const socket of userSockets) {
      if (socket.connected) {
        socket.emit(event, optimizedData);
        return true; // Return early after first delivery for high-throughput performance
      }
    }
    
    return false;
  }

  // Helper function to deliver any pending messages to a user - optimized for high throughput
  function deliverPendingMessages(userId: number) {
    let delivered = false;
    
    // High throughput optimization: Collect messages to be delivered in a batch
    const pendingMessages = [];
    const messagesToUpdate = [];
    
    // Calculate cut-off time for high-throughput optimization (6 hours instead of 1 day)
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const cutoffTime = now - SIX_HOURS;
    
    // Initial scan to collect pending messages and identify expired tracking data
    for (const [trackingId, messageData] of messageTrackingMap.entries()) {
      // First check: Is this message for this user and still undelivered?
      if (messageData.receiverId === userId && messageData.status === 'sent') {
        // Add to pending batch if not expired
        if (messageData.timestamp.getTime() > cutoffTime) {
          const messageId = parseInt(trackingId.replace('msg_', ''));
          pendingMessages.push({
            id: messageId,
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            content: messageData.content,
            timestamp: messageData.timestamp,
            status: 'delivered'
          });
          messagesToUpdate.push({ trackingId, messageId, senderId: messageData.senderId });
        } else {
          // Message too old, just remove from tracking
          messageTrackingMap.delete(trackingId);
        }
      }
      // Second check: Is this message tracking expired regardless of status?
      else if (messageData.timestamp.getTime() <= cutoffTime) {
        messageTrackingMap.delete(trackingId);
      }
    }
    
    // If no pending messages, exit early
    if (pendingMessages.length === 0) {
      return false;
    }
    
    // Send all pending messages in one batch if possible (for clients that support batching)
    // Or send individually if needed
    if (pendingMessages.length <= 20) { // Batch size limit to prevent payload size issues
      // Try to deliver all messages at once
      const batchDelivered = emitToUser(userId, 'message_batch', { messages: pendingMessages });
      
      if (batchDelivered) {
        delivered = true;
        
        // Update tracking status and database in bulk if possible
        const messageIds = messagesToUpdate.map(m => m.messageId);
        
        // Update database (using bulk operation when possible)
        if (storage.updateMessageStatusBulk) {
          storage.updateMessageStatusBulk(messageIds, 'delivered')
            .catch(err => log(`Error updating message status in bulk: ${err}`));
        } else {
          // Fallback to individual updates if bulk update not available
          messagesToUpdate.forEach(({ messageId }) => {
            storage.updateMessageStatus(messageId, 'delivered')
              .catch(err => log(`Error updating message status: ${err}`));
          });
        }
        
        // Update tracking map
        messagesToUpdate.forEach(({ trackingId }) => {
          if (messageTrackingMap.has(trackingId)) {
            messageTrackingMap.get(trackingId)!.status = 'delivered';
          }
        });
        
        // Notify senders all at once by grouping by sender
        const senderMap = new Map<number, number[]>();
        messagesToUpdate.forEach(({ senderId, messageId }) => {
          if (!senderMap.has(senderId)) {
            senderMap.set(senderId, []);
          }
          senderMap.get(senderId)!.push(messageId);
        });
        
        // Send batch notifications to each sender
        senderMap.forEach((messageIds, senderId) => {
          emitToUser(senderId, 'message_status_batch', {
            messageIds,
            status: 'delivered'
          });
        });
      }
    } else {
      // For very large batches, process in chunks of 20
      for (let i = 0; i < pendingMessages.length; i += 20) {
        const chunk = pendingMessages.slice(i, i + 20);
        const chunkUpdates = messagesToUpdate.slice(i, i + 20);
        
        // Try to deliver this chunk
        const chunkDelivered = emitToUser(userId, 'message_batch', { messages: chunk });
        
        if (chunkDelivered) {
          delivered = true;
          
          // Update tracking status and database for this chunk
          const messageIds = chunkUpdates.map(m => m.messageId);
          
          // Update database (using bulk operation when possible)
          if (storage.updateMessageStatusBulk) {
            storage.updateMessageStatusBulk(messageIds, 'delivered')
              .catch(err => log(`Error updating message status in bulk: ${err}`));
          } else {
            // Fallback to individual updates if bulk update not available
            chunkUpdates.forEach(({ messageId }) => {
              storage.updateMessageStatus(messageId, 'delivered')
                .catch(err => log(`Error updating message status: ${err}`));
            });
          }
          
          // Update tracking map
          chunkUpdates.forEach(({ trackingId }) => {
            if (messageTrackingMap.has(trackingId)) {
              messageTrackingMap.get(trackingId)!.status = 'delivered';
            }
          });
          
          // Notify senders
          const senderMap = new Map<number, number[]>();
          chunkUpdates.forEach(({ senderId, messageId }) => {
            if (!senderMap.has(senderId)) {
              senderMap.set(senderId, []);
            }
            senderMap.get(senderId)!.push(messageId);
          });
          
          // Send batch notifications to each sender
          senderMap.forEach((messageIds, senderId) => {
            emitToUser(senderId, 'message_status_batch', {
              messageIds,
              status: 'delivered'
            });
          });
        }
      }
    }
    
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
    const maxMessages = 200; // Increased for high throughput (100,000+ req/min)
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
    
    // Check if limit is exceeded before incrementing to reduce unnecessary operations
    if (rateLimit.count >= maxMessages) {
      // Only log every 10th excessive attempt to reduce logging overhead
      if (rateLimit.count % 10 === 0) {
        log(`User ${userId} exceeded message rate limit (${rateLimit.count}/${maxMessages})`);
      }
      return false; // Exceeds limit
    }
    
    // Increment count only when within limit
    rateLimit.count++;
    messageLimits.set(userId, rateLimit);
    
    return true; // Within limit
  }

  // Set up maintenance intervals with different frequencies
  
  // More frequent cleanup for rate limits (every 2 minutes) to prevent memory buildup during high load
  setInterval(() => {
    const now = Date.now();
    
    // Clean up expired rate limits
    let rateLimitCleanupCount = 0;
    Array.from(messageLimits.entries()).forEach(([userId, rateLimit]) => {
      if (rateLimit.resetTime <= now) {
        messageLimits.delete(userId);
        rateLimitCleanupCount++;
      }
    });
    
    if (rateLimitCleanupCount > 0) {
      log(`Cleaned up ${rateLimitCleanupCount} expired rate limits`);
    }
  }, 2 * 60 * 1000); // Run every 2 minutes
  
  // Frequent message tracking cleanup (every 15 minutes) for high-throughput performance
  setInterval(() => {
    const now = Date.now();
    // Reduce retention from 1 day to 6 hours for high-throughput environments
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    
    let messageTrackingCleanupCount = 0;
    Array.from(messageTrackingMap.entries()).forEach(([trackingId, messageData]) => {
      if (now - messageData.timestamp.getTime() > SIX_HOURS) {
        messageTrackingMap.delete(trackingId);
        messageTrackingCleanupCount++;
      }
    });
    
    if (messageTrackingCleanupCount > 0) {
      log(`Cleaned up ${messageTrackingCleanupCount} expired message tracking entries`);
    }
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  // Less frequent cleanup for user status (every hour)
  setInterval(() => {
    // Clean up inactive user status tracking
    cleanupInactiveUsers();
  }, 60 * 60 * 1000); // Run every hour

  return io;
}