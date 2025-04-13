/**
 * Character Thinking Service
 * 
 * This service allows characters to "think" independently by periodically generating
 * thoughts about users, conversations, and their own "feelings" or observations.
 * These thoughts can then be used to inform proactive messages and create more
 * natural, human-like interactions.
 */

import { storage } from '../storage';
import { generateCharacterResponse } from '../openai';
import { socketService } from '../socket-io-server';
import { activeConversations, trackConversation, getConversationKey } from './proactive-messaging';

// Define the character types in a way that matches the structure from character-db
interface BaseCharacter {
  id: string | number;
  name: string;
  description: string;
  persona: string;
  avatar: string;
}

interface PredefinedCharacter extends BaseCharacter {
  id: string;
}

interface CustomCharacter extends BaseCharacter {
  id: number;
  userId: number;
}

// Track character thoughts and internal states
interface CharacterThought {
  userId: number;
  characterId: string;
  thought: string;
  timestamp: number;
  type: 'observation' | 'feeling' | 'plan' | 'memory';
  relevance: number; // 1-10 rating of how relevant/important this thought is
}

// Map of characterId-userId to their current thoughts
const characterThoughts = new Map<string, CharacterThought[]>();

/**
 * Generate a "thinking" prompt to simulate the character's internal thought process
 */
async function generateThinkingPrompt(
  character: PredefinedCharacter | CustomCharacter,
  userId: number
): Promise<string> {
  // Get user information for context
  const user = await storage.getUserById(userId);
  const username = user?.username || "the user";
  
  // Get recent message history with this user
  const messages = await storage.getUserCharacterMessages(userId, character.id.toString());
  const recentMessages = messages.slice(-8); // Last 8 messages
  
  // Format chat history
  const chatHistory = recentMessages
    .map(msg => `${msg.isUser ? username : character.name}: ${msg.content}`)
    .join('\n');
  
  // Build the thinking prompt
  return `You are ${character.name}, with this character description: ${character.description}

Your character persona: ${character.persona}

This is an internal thought simulation for you as ${character.name}. This will not be shown directly to the user.
Instead, this represents your internal thinking process about your conversation with ${username}.

Here's your recent conversation with ${username}:
${chatHistory}

Based on this conversation and your character's personality, generate an internal thought that represents what you're thinking right now about:
1. Your observations about ${username}
2. How you feel about your relationship with ${username}
3. What you might want to talk about next or ask ${username} about
4. Any memories or associations this conversation brings up for you

Your thought should be 2-4 sentences and should feel authentic to your character's personality.
Start with phrases like "I notice that...", "I wonder if...", "I feel...", or "Maybe I should..."

IMPORTANT: This is your private thought, so express your true feelings and observations as ${character.name} would think them, not say them.`;
}

/**
 * Generate a new thought for a character about a specific user
 */
async function generateCharacterThought(
  character: PredefinedCharacter | CustomCharacter,
  userId: number
): Promise<CharacterThought | null> {
  try {
    console.log(`[CharacterThinking] Generating thought for ${character.name} about user ${userId}`);
    
    // Generate the thinking prompt
    const thinkingPrompt = await generateThinkingPrompt(character, userId);
    
    // Use existing LLM integration to generate the thought
    const thoughtResponse = await generateCharacterResponse(
      {
        id: character.id.toString(),
        name: character.name,
        description: character.description,
        persona: character.persona,
        avatar: character.avatar
      },
      thinkingPrompt,
      "", // No chat history needed since we included it in the prompt
      'english',
      undefined,
      undefined
    );
    
    if (!thoughtResponse) {
      console.error(`[CharacterThinking] Failed to generate thought for ${character.name}`);
      return null;
    }
    
    console.log(`[CharacterThinking] ${character.name}'s thought: "${thoughtResponse.substring(0, 100)}${thoughtResponse.length > 100 ? '...' : ''}"`);
    
    // Determine thought type based on content
    let type: 'observation' | 'feeling' | 'plan' | 'memory' = 'observation';
    if (thoughtResponse.toLowerCase().includes("feel") || thoughtResponse.toLowerCase().includes("emotion")) {
      type = 'feeling';
    } else if (thoughtResponse.toLowerCase().includes("plan") || thoughtResponse.toLowerCase().includes("should") || thoughtResponse.toLowerCase().includes("will ask")) {
      type = 'plan';
    } else if (thoughtResponse.toLowerCase().includes("remember") || thoughtResponse.toLowerCase().includes("recall") || thoughtResponse.toLowerCase().includes("reminded")) {
      type = 'memory';
    }
    
    // Randomly assign relevance, weighted toward higher values for more meaningful thoughts
    const relevance = Math.floor(Math.random() * 5) + 5; // 5-10 range
    
    // Create and return the thought
    return {
      userId,
      characterId: character.id.toString(),
      thought: thoughtResponse,
      timestamp: Date.now(),
      type,
      relevance
    };
  } catch (error) {
    console.error(`[CharacterThinking] Error generating thought:`, error);
    return null;
  }
}

/**
 * Get the most recent thought for a character about a specific user
 */
export function getRecentCharacterThought(characterId: string, userId: number): CharacterThought | null {
  const key = getConversationKey(userId, characterId);
  const thoughts = characterThoughts.get(key);
  
  if (!thoughts || thoughts.length === 0) {
    return null;
  }
  
  // Return the most recent thought
  return thoughts[thoughts.length - 1];
}

/**
 * Process thinking for all active characters
 */
async function processCharacterThinking(): Promise<void> {
  console.log(`[CharacterThinking] Processing thinking for active characters`);
  
  // Get all active conversations
  const conversations = Array.from(activeConversations.values());
  const processedCount = {
    success: 0,
    failure: 0
  };
  
  // Process each conversation (up to 5 at a time to avoid overloading)
  const conversationsToProcess = conversations.slice(0, 5);
  
  for (const conversation of conversationsToProcess) {
    const { userId, characterId } = conversation;
    const key = getConversationKey(userId, characterId);
    
    try {
      // Check if we should generate a new thought 
      // (either no thoughts yet or last thought was more than 1 hour ago)
      const existingThoughts = characterThoughts.get(key) || [];
      const lastThoughtTime = existingThoughts.length > 0 
        ? existingThoughts[existingThoughts.length - 1].timestamp 
        : 0;
      
      // See if enough time has passed since last thought (1 hour)
      const timeSinceLastThought = Date.now() - lastThoughtTime;
      const shouldGenerateNewThought = timeSinceLastThought > 60 * 60 * 1000; // 1 hour
      
      if (shouldGenerateNewThought) {
        // Get the character
        let character: PredefinedCharacter | CustomCharacter | null = null;
        
        if (characterId.startsWith('custom_')) {
          const customId = parseInt(characterId.replace('custom_', ''));
          character = await storage.getCustomCharacterById(customId);
        } else {
          character = await storage.getPredefinedCharacterById(characterId);
        }
        
        if (!character) {
          console.error(`[CharacterThinking] Character ${characterId} not found`);
          processedCount.failure++;
          continue;
        }
        
        // Generate a new thought
        const newThought = await generateCharacterThought(character, userId);
        
        if (newThought) {
          // Add to the character's thoughts
          const updatedThoughts = [...existingThoughts, newThought].slice(-10); // Keep only last 10 thoughts
          characterThoughts.set(key, updatedThoughts);
          
          console.log(`[CharacterThinking] Generated new thought for ${character.name} about user ${userId}`);
          processedCount.success++;
        } else {
          processedCount.failure++;
        }
      }
    } catch (error) {
      console.error(`[CharacterThinking] Error processing character thinking for ${characterId}:`, error);
      processedCount.failure++;
    }
  }
  
  console.log(`[CharacterThinking] Complete: ${processedCount.success} successful, ${processedCount.failure} failed`);
}

/**
 * Initialize the character thinking system
 */
export function initializeCharacterThinking(): void {
  // Process character thinking every 30 minutes
  setInterval(processCharacterThinking, 30 * 60 * 1000);
  
  // Initial processing after 1 minute startup delay
  setTimeout(processCharacterThinking, 60 * 1000);
  
  console.log('[CharacterThinking] Service initialized');
}

// Export the character thoughts for test/inspection
export function getAllCharacterThoughts(): Record<string, CharacterThought[]> {
  const result: Record<string, CharacterThought[]> = {};
  
  characterThoughts.forEach((thoughts, key) => {
    result[key] = thoughts;
  });
  
  return result;
}