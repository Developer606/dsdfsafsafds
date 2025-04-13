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
}

// Default settings for a natural typing experience
const defaultConfig: ProgressiveDeliveryConfig = {
  typingSpeed: 300, // characters per minute
  minDelay: 500, // minimum 500ms between chunks
  maxDelay: 2000, // maximum 2s between chunks
  targetChunkSize: 30, // aim for ~30 character chunks
  chunkSizeVariation: 0.3, // 30% variation in chunk size
};

/**
 * Split a message into natural chunks based on sentence structure and punctuation
 */
function splitIntoChunks(message: string, config: ProgressiveDeliveryConfig): string[] {
  // Regular expression to split on sentence boundaries and preserve delimiters
  const sentenceBoundaries = /([.!?]\s+|\n+)/g;
  
  // First split by sentence boundaries
  const sentences = message.split(sentenceBoundaries).reduce((acc, current, i, arr) => {
    // Add the current part
    acc.push(current);
    // If this is a boundary and not the last item, add it to the sentence before
    if (i % 2 === 1 && i < arr.length - 1) {
      acc[acc.length - 2] += current;
      // Remove the boundary from its own entry
      acc.pop();
    }
    return acc;
  }, [] as string[]);

  // Filter out empty strings
  const filteredSentences = sentences.filter(s => s.trim().length > 0);
  
  // If sentences are short enough already, return them directly
  if (filteredSentences.every(s => s.length <= config.targetChunkSize * (1 + config.chunkSizeVariation))) {
    return filteredSentences;
  }
  
  // If some sentences are too long, split them further based on commas and conjunctions
  const result: string[] = [];
  
  for (const sentence of filteredSentences) {
    if (sentence.length <= config.targetChunkSize * (1 + config.chunkSizeVariation)) {
      // This sentence is already small enough
      result.push(sentence);
    } else {
      // Split further by commas, semicolons, and conjunctions
      const subParts = sentence.split(/([,;]\s+|(?<=\s)(and|but|or|because|since|although|though|while|if|unless|until)\s+)/g);
      
      let currentChunk = '';
      for (let i = 0; i < subParts.length; i++) {
        const part = subParts[i];
        if (!part || part.length === 0) continue;
        
        // Calculate target size with some natural variation
        const variation = 1 + (Math.random() * 2 - 1) * config.chunkSizeVariation;
        const currentTargetSize = Math.floor(config.targetChunkSize * variation);
        
        if (currentChunk.length + part.length <= currentTargetSize || currentChunk.length === 0) {
          // Add to current chunk
          currentChunk += part;
        } else {
          // Current chunk is full - push it and start a new one
          result.push(currentChunk);
          currentChunk = part;
        }
      }
      
      // Add the final chunk if there's anything left
      if (currentChunk.length > 0) {
        result.push(currentChunk);
      }
    }
  }
  
  // Final filter to remove any empty chunks
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
    // Start typing indicator
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: true });
    
    // Send each message chunk with a delay
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Accumulate the message
      accumulatedMessage += chunk;
      
      // Wait for a natural delay
      const delay = calculateDelay(chunk.length, config);
      await new Promise(resolve => setTimeout(resolve, delay));
      
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
      
      // Emit the partial message to the user
      io.to(`user_${userId}`).emit('character_message', {
        message: partialMessage,
        character: {
          id: characterId,
          name: characterName,
          avatar: characterAvatar
        },
        isProgressiveUpdate: true
      });
      
      // If this is not the last chunk, we need to show typing again
      if (i < chunks.length - 1) {
        // Small pause before typing indicator returns
        await new Promise(resolve => setTimeout(resolve, 200));
        io.to(`user_${userId}`).emit('typing_indicator', { isTyping: true });
      }
    }
    
    // Stop typing indicator after full message is delivered
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: false });
    
  } catch (error) {
    console.error('[ProgressiveDelivery] Error delivering progressive message:', error);
    
    // Ensure typing indicator is always turned off in case of errors
    io.to(`user_${userId}`).emit('typing_indicator', { isTyping: false });
  }
}