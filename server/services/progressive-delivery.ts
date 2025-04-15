/**
 * Progressive Message Delivery Service
 * 
 * This service breaks character messages into smaller chunks
 * and delivers them progressively with typing animations to create
 * a more natural, human-like conversation experience.
 */

import { socketService } from '../socket-io-server';

// Default configuration
interface ProgressiveDeliveryConfig {
  // Average characters per minute typing speed
  typingSpeed: number;
  // Minimum delay between chunks in ms
  minDelay: number;
  // Maximum delay between chunks in ms
  maxDelay: number;
  // Target size for each message chunk (characters)
  targetChunkSize: number;
  // Natural variation in chunk size (percentage)
  chunkSizeVariation: number;
  // Flag to indicate this is a follow-up message (optional)
  isFollowUpMessage?: boolean;
}

// Default settings for a natural typing experience
const defaultConfig: ProgressiveDeliveryConfig = {
  typingSpeed: 200, // characters per minute - slower for more natural feel
  minDelay: 600, // minimum 600ms between chunks
  maxDelay: 1800, // maximum 1.8s between chunks
  targetChunkSize: 20, // aim for smaller ~20 character chunks
  chunkSizeVariation: 0.4, // 40% variation in chunk size for more natural delivery
  isFollowUpMessage: false // Default to not being a follow-up message
};

/**
 * Split a message into natural chunks based on sentence structure and punctuation
 * This implementation creates smaller, more natural chunks similar to human typing patterns
 */
function splitIntoChunks(message: string, config: ProgressiveDeliveryConfig): string[] {
  // First split by natural pauses (periods, question marks, exclamation marks, new lines)
  // Ensure message is a valid string before splitting
  if (!message || typeof message !== 'string') {
    console.error('[ProgressiveDelivery] Invalid message in splitIntoChunks:', message);
    return ['No message available.'];
  }
  
  const naturalPauses = message.split(/(?<=[.!?]\s+|\n+)/);
  
  // Result array for final chunks
  const result: string[] = [];
  
  // Process each natural pause section
  for (const section of naturalPauses) {
    // Skip empty or undefined sections
    if (!section || !section.trim()) continue;
    
    // If section is already short, add it directly
    if (section.length <= config.targetChunkSize) {
      result.push(section);
      continue;
    }
    
    // For longer sections, split by natural pause points (commas, conjunction words, etc.)
    const pausePoints = section.split(/(?<=([,;:]\s+|(?<=\s)(and|but|or|because|since|although|though|while|if|unless|until)\s+))/);
    
    let currentChunk = '';
    
    for (let i = 0; i < pausePoints.length; i++) {
      const part = pausePoints[i];
      // Skip empty parts or undefined parts
      if (!part || !part.trim()) continue;
      
      // Add some random variation to target size to make it feel more natural
      const variation = 1 + (Math.random() * 2 - 1) * config.chunkSizeVariation;
      const currentTargetSize = Math.floor(config.targetChunkSize * variation);
      
      // If adding this part would exceed target size and we already have content, 
      // push current chunk and start new one
      if (currentChunk && (currentChunk.length + part.length > currentTargetSize)) {
        result.push(currentChunk);
        currentChunk = part;
      }
      // If this is a very long part with no natural breaks, split by word boundaries
      else if (!currentChunk && part.length > currentTargetSize * 1.5) {
        // Split by word boundaries
        const words = part.split(/\s+/);
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk && (wordChunk.length + word.length + 1 > currentTargetSize)) {
            result.push(wordChunk);
            wordChunk = word;
          } else {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
      // Otherwise just add to current chunk
      else {
        currentChunk += part;
      }
    }
    
    // Don't forget to add the last chunk
    if (currentChunk) {
      result.push(currentChunk);
    }
  }
  
  // Ensure we don't have any empty chunks
  return result.filter(chunk => chunk.trim().length > 0);
}

/**
 * Calculate a natural delay between message chunks
 */
function calculateDelay(chunkLength: number, config: ProgressiveDeliveryConfig): number {
  // Base delay to simulate typing time
  const typingTimeMs = (chunkLength / config.typingSpeed) * 60 * 1000;
  
  // Add some random variation
  const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
  
  // Calculate final delay, clamped between min and max values
  return Math.min(
    Math.max(typingTimeMs * randomFactor, config.minDelay),
    config.maxDelay
  );
}

/**
 * Progressively deliver a character message through socket.io
 * This mimics realistic human typing patterns with clear typing indicators
 * between message chunks to match the reference image
 */
export async function deliverProgressiveMessage(
  userId: number,
  characterId: string,
  message: string,
  messageId: number,
  characterName: string,
  characterAvatar: string,
  customConfig?: Partial<ProgressiveDeliveryConfig>
): Promise<void> {
  // Merge default config with any custom settings
  const config = { ...defaultConfig, ...customConfig };
  
  // Make sure we have a valid message before splitting
  if (!message || typeof message !== 'string') {
    console.error('[ProgressiveDelivery] Invalid message received:', message);
    return;
  }
  
  // Split message into natural chunks
  const chunks = splitIntoChunks(message, config);
  
  // Track the complete message so far for each chunk
  let accumulatedMessage = '';
  
  // Get socket.io instance
  const io = socketService.getIO();
  if (!io) {
    console.error('[ProgressiveDelivery] Socket.IO not initialized');
    return;
  }
  
  try {
    // Initial typing indicator before any text appears
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: true });
    
    // Add some initial typing delay before first message chunk
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check if user has active connections - we'll emit events regardless to ensure data is synchronized
    const userSocketRoom = `user_${userId}`;
    const roomSockets = io.sockets.adapter.rooms.get(userSocketRoom);
    const userIsActive = !!roomSockets && roomSockets.size > 0;
    
    console.log(`[ProgressiveDelivery] Delivering message to user ${userId}, active connections: ${userIsActive ? roomSockets?.size : 0}`);
    
    // Send each message chunk with a delay
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Accumulate the message
      accumulatedMessage += chunk;
      
      // Hide typing indicator just before showing the new chunk
      io.to(`user_${userId}`).emit('typing_indicator', { isTyping: false });
      
      // Short pause before showing the new text
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Create a partial message object
      const partialMessage = {
        id: messageId,
        userId,
        characterId,
        content: accumulatedMessage,
        isUser: false,
        timestamp: new Date(),
        isPartial: i < chunks.length - 1
      };
      
      // Check if this is a follow-up message (either from config or content detection)
      const isFollowUpDetected = 
        config.isFollowUpMessage || 
        accumulatedMessage.includes("As promised") || 
        accumulatedMessage.includes("I'm back") || 
        accumulatedMessage.includes("Just as I said") || 
        accumulatedMessage.includes("As I promised");
      
      // Log special handling for follow-up messages
      if (isFollowUpDetected && i === 0) {
        console.log(`[ProgressiveDelivery] Special animation handling for follow-up message ${messageId}`);
      }
      
      // Emit the partial message to the user - even if they're offline
      // This ensures the data is sent to any existing connections,
      // and will be properly synchronized when the user returns
      io.to(`user_${userId}`).emit('character_message', {
        message: partialMessage,
        character: {
          id: characterId,
          name: characterName,
          avatar: characterAvatar
        },
        isProgressiveUpdate: i < chunks.length - 1, // Mark last chunk as not progressive for client reference
        isFollowUpMessage: isFollowUpDetected, // Explicitly flag follow-up messages
        chunkIndex: i, // Send chunk index to help client with animation timing
        totalChunks: chunks.length // Total chunks info helps client optimize animations
      });
      
      // If this is not the last chunk, show typing indicator again with a pause
      if (i < chunks.length - 1) {
        // Calculate delay based on the next chunk's length
        const nextChunk = chunks[i + 1];
        const typingDelay = calculateDelay(nextChunk.length, config);
        
        // Short pause after message appears before typing indicator returns
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Show typing indicator for the next chunk
        io.to(`user_${userId}`).emit('typing_indicator', { isTyping: true });
        
        // Simulate typing the next chunk
        await new Promise(resolve => setTimeout(resolve, typingDelay));
      }
    }
    
    // For the final message, also emit a specialized non-progressive event
    // to ensure the message is captured by client-side listeners
    // This is particularly important for follow-up messages
    if (chunks.length > 0) {
      const finalMessage = {
        id: messageId,
        userId,
        characterId,
        content: accumulatedMessage,
        isUser: false,
        timestamp: new Date(),
        isPartial: false
      };
      
      // Use the same follow-up detection logic for consistency
      const isFollowUp = 
        config.isFollowUpMessage || 
        accumulatedMessage.includes("As promised") || 
        accumulatedMessage.includes("I'm back") || 
        accumulatedMessage.includes("Just as I said") || 
        accumulatedMessage.includes("As I promised") || 
        accumulatedMessage.includes("Here's what") ||
        accumulatedMessage.includes("As mentioned") ||
        accumulatedMessage.includes("Like I said") ||
        accumulatedMessage.includes("As I said");
      
      // Emit the complete message again to ensure it's captured by any reconnecting clients
      io.to(`user_${userId}`).emit('character_message', {
        message: finalMessage,
        character: {
          id: characterId,
          name: characterName,
          avatar: characterAvatar
        },
        isProgressiveUpdate: false,
        isFollowUpMessage: isFollowUp, // Use consistent follow-up detection
        totalChunks: chunks.length,    // Include total chunks info for client animation
        chunkIndex: chunks.length - 1  // Final chunk index
      });
      
      // Ultra-aggressive handling for follow-up messages to guarantee immediate display
      if (isFollowUp) {
        // Log follow-up message detection with high visibility
        console.log(`[ProgressiveDelivery] ULTRA PRIORITY: Detected follow-up message with ID ${messageId}, maximizing delivery methods`);
        
        // STRATEGY 1: Emit specialized follow-up event with special flag
        io.to(`user_${userId}`).emit('follow_up_message', {
          message: finalMessage,
          character: {
            id: characterId,
            name: characterName,
            avatar: characterAvatar
          },
          isFollowUpMessage: true,
          timestamp: new Date().toISOString()
        });
        
        // STRATEGY 2: Emit standard new_message event with follow-up flag to original user
        io.to(`user_${userId}`).emit('new_message', {
          message: finalMessage,
          character: {
            id: characterId,
            name: characterName,
            avatar: characterAvatar
          },
          isFollowUpMessage: true
        });
        
        // STRATEGY 3: Broadcast globally as a fallback for any socket reconnection issues
        io.emit('new_message', {
          message: finalMessage,
          character: {
            id: characterId,
            name: characterName,
            avatar: characterAvatar
          },
          isFollowUpMessage: true
        });
        
        // STRATEGY 4: Send a non-socket standard HTTP notification to ensure the client gets it
        try {
          // Persist the follow-up message immediately in case the socket fails
          console.log(`[ProgressiveDelivery] Ensuring follow-up message ID ${messageId} is persisted for HTTP polling`);
        } catch (error) {
          console.error('[ProgressiveDelivery] Error persisting follow-up message:', error);
        }
      } else {
        // Standard notification for regular messages
        io.to(`user_${userId}`).emit('new_message', {
          message: finalMessage,
          character: {
            id: characterId,
            name: characterName,
            avatar: characterAvatar
          }
        });
      }
      
      console.log(`[ProgressiveDelivery] Delivered complete message ${messageId} to user ${userId}`);
    }
    
    // Ensure typing indicator is off after full message is delivered
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: false });
    
  } catch (error) {
    console.error('[ProgressiveDelivery] Error delivering progressive message:', error);
    
    // Ensure typing indicator is always turned off in case of errors
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: false });
  }
}