import { nanoid } from 'nanoid';

/**
 * Generate a unique message ID for temporary tracking
 */
export function generateMessageId(): string {
  return nanoid(10);
}

/**
 * Split a long message into multiple smaller chunks for a more natural typing effect
 * @param message The full message to split
 * @param minChunkSize Minimum size of each chunk (characters)
 * @param maxChunkSize Maximum size of each chunk (characters)
 * @param minChunks Minimum number of chunks to create
 * @returns Array of message chunks
 */
export function splitMessageIntoChunks(
  message: string, 
  minChunkSize: number = 30, 
  maxChunkSize: number = 150,
  minChunks: number = 2
): string[] {
  // If message is short, just return it as a single chunk
  if (message.length <= maxChunkSize && minChunks <= 1) {
    return [message];
  }
  
  // Determine how many chunks we need
  const numChunks = Math.max(
    minChunks,
    Math.ceil(message.length / maxChunkSize)
  );
  
  // Split at natural break points (sentences, punctuation)
  const chunks: string[] = [];
  let remainingMessage = message;
  
  // Create chunks by finding natural break points
  while (remainingMessage.length > 0 && chunks.length < numChunks - 1) {
    // Calculate a target chunk size in the allowed range
    // (randomize for more human-like typing)
    const targetChunkSize = Math.floor(
      Math.random() * (maxChunkSize - minChunkSize) + minChunkSize
    );
    
    // Don't make a chunk if not enough text remains
    if (remainingMessage.length <= targetChunkSize) {
      break;
    }
    
    // Look for natural break points near our target size
    let breakPoint = -1;
    
    // First, try to find sentence endings
    const sentenceEndMatch = remainingMessage
      .substring(0, targetChunkSize + 30)
      .match(/[.!?]\s+/g);
      
    if (sentenceEndMatch && sentenceEndMatch.length > 0) {
      // Find the last sentence break within our range
      let lastIndex = -1;
      for (const match of sentenceEndMatch) {
        const index = remainingMessage.indexOf(match, lastIndex + 1);
        if (index <= targetChunkSize + 30) {
          breakPoint = index + match.length - 1;
          lastIndex = index;
        } else {
          break;
        }
      }
    }
    
    // If no sentence break found, try to find a comma
    if (breakPoint === -1) {
      const commaMatch = remainingMessage
        .substring(0, targetChunkSize + 20)
        .match(/,\s+/g);
        
      if (commaMatch && commaMatch.length > 0) {
        let lastIndex = -1;
        for (const match of commaMatch) {
          const index = remainingMessage.indexOf(match, lastIndex + 1);
          if (index <= targetChunkSize + 20) {
            breakPoint = index + match.length - 1;
            lastIndex = index;
          } else {
            break;
          }
        }
      }
    }
    
    // If no good break, try to find a space near the target
    if (breakPoint === -1) {
      const spaceIndex = remainingMessage.lastIndexOf(" ", targetChunkSize);
      if (spaceIndex !== -1 && spaceIndex >= minChunkSize) {
        breakPoint = spaceIndex;
      }
    }
    
    // If all else fails, just split at the target size
    if (breakPoint === -1 || breakPoint < minChunkSize) {
      breakPoint = targetChunkSize;
    }
    
    // Extract the chunk and add to our array
    const chunk = remainingMessage.substring(0, breakPoint + 1);
    chunks.push(chunk.trim());
    
    // Remove this chunk from the remaining message
    remainingMessage = remainingMessage.substring(breakPoint + 1);
  }
  
  // Add the remaining text as the final chunk
  if (remainingMessage.length > 0) {
    chunks.push(remainingMessage.trim());
  }
  
  return chunks;
}