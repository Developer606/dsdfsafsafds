import fs from 'fs';
import path from 'path';

// Type definitions for encrypted message format
interface EncryptedMessage {
  version: string;
  encrypted: string;
  nonce: string;
  moderationHash: string;
}

// Track prohibited word hashes instead of the words themselves
let prohibitedWordHashes: Record<string, string[]> = {
  'violence': [],
  'hate_speech': [],
  'sexual_exploitation': [],
  'harassment': [],
  'self_harm': []
};

/**
 * Initialize the prohibited word hash database
 */
export function initializeProhibitedWordHashes() {
  try {
    // Load the current prohibited words from the content moderation module
    const { getProhibitedWords } = require('./content-moderation');
    const prohibitedWords = getProhibitedWords();
    
    // Convert each word to its hash
    for (const category in prohibitedWords.defaultWords) {
      prohibitedWordHashes[category] = prohibitedWords.defaultWords[category].map((word: string) => 
        generateWordHash(word)
      );
    }
    
    // Also add custom words
    for (const category in prohibitedWords.customWords) {
      if (prohibitedWordHashes[category]) {
        // Add to existing array
        const customHashes = prohibitedWords.customWords[category].map((word: string) => 
          generateWordHash(word)
        );
        prohibitedWordHashes[category] = [...prohibitedWordHashes[category], ...customHashes];
      } else {
        // Create new array
        prohibitedWordHashes[category] = prohibitedWords.customWords[category].map((word: string) => 
          generateWordHash(word)
        );
      }
    }
    
    console.log('Initialized prohibited word hashes for encrypted messages');
  } catch (error) {
    console.error('Error initializing prohibited word hashes:', error);
  }
}

/**
 * Generate a hash for a specific word that matches the client-side hash
 * @param word The word to hash
 * @returns The hash string
 */
function generateWordHash(word: string): string {
  const normalizedWord = word.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedWord);
  return Array.from(data)
    .reduce((hash, byte) => ((hash << 5) - hash) + byte, 0)
    .toString(36);
}

/**
 * Check if a message hash matches any prohibited word hashes
 * @param messageHash The hash from the encrypted message
 * @returns Check result with flag status and reason
 */
export function checkEncryptedMessageContent(content: string): { flagged: boolean; reason?: string } {
  try {
    // Parse the message content to extract the moderation hash
    let parsedContent: EncryptedMessage;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      return { flagged: false }; // Not JSON content, can't be an encrypted message
    }
    
    // Check if this is an encrypted message with a moderation hash
    if (!parsedContent.version || parsedContent.version !== 'e2ee-v1' || !parsedContent.moderationHash) {
      return { flagged: false }; // Not an encrypted message or missing hash
    }
    
    const moderationHash = parsedContent.moderationHash;
    
    // Check if the hash matches any of our prohibited word hashes
    for (const category in prohibitedWordHashes) {
      const matched = matchesProhibitedHash(moderationHash, category);
      if (matched) {
        return {
          flagged: true,
          reason: `Prohibited content (${category})`
        };
      }
    }
    
    return { flagged: false };
  } catch (error) {
    console.error('Error checking encrypted message:', error);
    return { flagged: false };
  }
}

/**
 * Check if a message hash contains any prohibited hashes from a category
 * @param hash The message hash to check
 * @param category The category of prohibited words to check against
 * @returns True if the hash matches any prohibited hash
 */
function matchesProhibitedHash(hash: string, category: string): boolean {
  // For a real implementation, we would need a more sophisticated algorithm
  // that can detect partial matches in the hash
  // This is a simplified approach for demonstration
  return prohibitedWordHashes[category].some(prohibitedHash => {
    // Check if the hash fingerprint might contain this prohibited word
    // This is an oversimplified check and would need refinement in practice
    return hash.includes(prohibitedHash);
  });
}

/**
 * Add a new prohibited word hash
 * @param category The category to add the word hash to
 * @param word The word to generate a hash for
 */
export function addProhibitedWordHash(category: string, word: string): { success: boolean; error?: string } {
  if (!prohibitedWordHashes[category]) {
    return { success: false, error: `Category '${category}' does not exist` };
  }
  
  const wordHash = generateWordHash(word);
  prohibitedWordHashes[category].push(wordHash);
  return { success: true };
}

/**
 * Remove a prohibited word hash
 * @param category The category to remove the word hash from
 * @param word The word to remove
 */
export function removeProhibitedWordHash(category: string, word: string): { success: boolean; error?: string } {
  if (!prohibitedWordHashes[category]) {
    return { success: false, error: `Category '${category}' does not exist` };
  }
  
  const wordHash = generateWordHash(word);
  const index = prohibitedWordHashes[category].indexOf(wordHash);
  
  if (index === -1) {
    return { success: false, error: `Word '${word}' not found in category '${category}'` };
  }
  
  prohibitedWordHashes[category].splice(index, 1);
  return { success: true };
}