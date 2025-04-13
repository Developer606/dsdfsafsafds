/**
 * Follow-up Messages Service
 * 
 * This service allows characters to automatically follow up on promises
 * they made in previous messages, such as "I'll be right back with food"
 * by actually sending a follow-up message about returning with food.
 */

import { storage } from '../storage';
import { socketService } from '../socket-io-server';
import { generateCharacterResponse } from '../openai';
import { deliverProgressiveMessage } from './progressive-delivery';

// Response patterns that should trigger follow-up messages
interface FollowUpPattern {
  regex: RegExp;
  delay: number; // Delay in ms before follow-up
  prompt: string; // Prompt to generate follow-up message
}

// Follow-up patterns to detect in character messages
const followUpPatterns: FollowUpPattern[] = [
  // Food related follow-ups
  {
    regex: /I'll be (right )?back with (your|the) food/i,
    delay: 8000, // 8 seconds
    prompt: "You promised to come back with food. You've now returned with the food. Describe the food you've brought and your reaction to seeing the user again."
  },
  {
    regex: /I think you mean.*?I'll be right back with your food/i,
    delay: 8000, // 8 seconds
    prompt: "You corrected the user's English and said you'll be right back with food. You've now returned with the food. Describe what food you've brought and your excitement about sharing it with them."
  },
  {
    regex: /I'll go (get|prepare|make|cook) (some|the|a) (.+?) for you/i,
    delay: 10000, // 10 seconds
    prompt: "You said you would get/prepare/make/cook something for the user. You've now returned with it. Describe what you've brought and your excitement to share it with them."
  },
  {
    regex: /I'll (bring|get|fetch) you (some|a|an|the) (.+?)( (later|soon|in a bit|in a moment|when I'm done))?/i,
    delay: 12000,
    prompt: "You promised to bring something to the user. You've now returned with it. Describe what you've brought and your feelings about giving it to them."
  },
  
  // Temporary absence follow-ups
  {
    regex: /I need to (go|leave) for a (moment|second|minute|bit)/i,
    delay: 15000, // 15 seconds
    prompt: "You said you needed to leave for a moment. You've now returned. Explain where you went and what happened while you were gone."
  },
  {
    regex: /I'll be (right |just )?back/i,
    delay: 10000,
    prompt: "You said you'd be right back. You've now returned. Describe what you were doing and your current state/mood."
  },
  {
    regex: /(wait|hold on|give me a (second|minute|moment))/i,
    delay: 8000,
    prompt: "You asked the user to wait or give you a moment. Now that time has passed, continue the conversation with what you wanted to say or do."
  },
  {
    regex: /(brb|be right back)/i,
    delay: 10000,
    prompt: "You said you'd be right back. You've now returned to the conversation. Explain what you were doing or mention that you're back now."
  },
  
  // Information gathering follow-ups
  {
    regex: /I'll (check|find out|ask|see) (and|then) (let you know|tell you|get back to you)/i,
    delay: 12000, // 12 seconds
    prompt: "You promised to check something and get back to the user. You've now returned with the information. Share what you found out with excitement or interest."
  },
  {
    regex: /let me (check|verify|confirm|think about|find|search for|look for) (.+?)( first| quickly| for you)?/i,
    delay: 15000,
    prompt: "You said you'd check or find something. You've now completed that task. Share what you discovered or your thoughts about it."
  },
  
  // Action-based follow-ups
  {
    regex: /I (will|should|need to|have to) (.+?) (and|then) (I'll|I will) (.+?)/i,
    delay: 18000,
    prompt: "You said you needed to do something and then do something else. You've now completed these actions. Describe what happened and the outcome."
  },
  {
    regex: /I'm going to (.+?) (right now|now|quickly)/i,
    delay: 12000,
    prompt: "You said you were going to do something right away. You've now completed that action. Describe what happened and how you feel about it."
  },
  
  // Promise-based follow-ups
  {
    regex: /I promise (to|I'll|I will) (.+?)/i,
    delay: 15000,
    prompt: "You made a promise to the user. You've now fulfilled that promise. Describe how you kept your promise and the result."
  },
  {
    regex: /(yes|sure|of course|definitely|absolutely)[,.!]? I (can|will|could) (.+?) for you/i,
    delay: 14000,
    prompt: "You agreed to do something for the user. You've now completed that task. Describe what you did and express your happiness to help."
  }
];

/**
 * Check if a message matches any follow-up patterns
 * @param message The message to check
 * @returns The matching pattern or null if no match
 */
function checkForFollowUpPromise(message: string): FollowUpPattern | null {
  // Debug: Print all pattern tests against this message
  console.log(`[FollowUpMessages] Testing message against ${followUpPatterns.length} patterns: "${message}"`);
  
  for (const pattern of followUpPatterns) {
    const matches = pattern.regex.test(message);
    console.log(`[FollowUpMessages] Pattern ${pattern.regex} => ${matches ? 'MATCHED' : 'no match'}`);
    
    if (matches) {
      return pattern;
    }
  }
  return null;
}

/**
 * Schedule an automatic follow-up message based on a character's promise
 */
export async function scheduleFollowUpMessage(
  userId: number,
  characterId: string,
  message: string,
  characterName: string,
  characterAvatar: string,
  characterPersonality: string
): Promise<void> {
  // Check if message contains a promise pattern
  console.log(`[FollowUpMessages] Checking for promises in message: "${message}"`);
  const followUpPattern = checkForFollowUpPromise(message);
  
  // If no follow-up needed, return
  if (!followUpPattern) {
    console.log('[FollowUpMessages] No promise patterns detected in message');
    return;
  }
  
  console.log(`[FollowUpMessages] Detected promise pattern: ${followUpPattern.regex}`);
  console.log(`[FollowUpMessages] Detected promise in character message: "${message}"`);
  console.log(`[FollowUpMessages] Scheduling follow-up in ${followUpPattern.delay}ms`);
  
  // Schedule the follow-up message after the specified delay
  setTimeout(async () => {
    try {
      // Check if the user is still active in the chat
      const io = socketService.getIO();
      const userSocketId = `user_${userId}`;
      
      // Skip follow-up if the socket.io instance isn't available
      if (!io) {
        console.log('[FollowUpMessages] Socket.IO not available, skipping follow-up');
        return;
      }
      
      // Get user's profile for context
      const user = await storage.getUserById(userId);
      if (!user) {
        console.log(`[FollowUpMessages] User ${userId} not found, skipping follow-up`);
        return;
      }
      
      // Prepare character's persona and style information
      let character;
      if (characterId.startsWith('custom_')) {
        const customId = parseInt(characterId.replace('custom_', ''));
        character = await storage.getCustomCharacterById(customId);
      } else {
        character = await storage.getPredefinedCharacterById(characterId);
      }
      
      if (!character) {
        console.log(`[FollowUpMessages] Character ${characterId} not found, skipping follow-up`);
        return;
      }
      
      // Create a character object for the LLM
      const characterObject = {
        id: characterId,
        name: characterName,
        avatar: characterAvatar,
        description: `${characterName} is following up on a previous conversation`,
        persona: characterPersonality || 'friendly and helpful character'
      };
      
      // Create a prompt for the follow-up message
      const userPrompt = `You previously said: "${message}" ${followUpPattern.prompt}`;
      
      // Create chat history context
      const chatHistory = `Character: ${characterName}
User: ${user.username || 'User'}
Character: ${message}`;
      
      // Generate AI response using the LLM
      const aiResponse = await generateCharacterResponse(
        characterObject,
        userPrompt,
        chatHistory,
        'english',
        undefined,
        {
          fullName: user.fullName || undefined,
          age: user.age || undefined,
          gender: user.gender || undefined,
          bio: user.bio || undefined
        }
      );
      
      // Store the message in the database with required fields
      const messageData = {
        userId,
        characterId,
        content: aiResponse,
        isUser: false,
        language: 'en', // Default to English, could be enhanced to detect or match user's language
        timestamp: new Date()
      };
      
      const followUpMessage = await storage.createMessage(messageData);
      console.log(`[FollowUpMessages] Created follow-up message: ${followUpMessage.id}`);
      
      // Deliver the message progressively with typing indicators
      deliverProgressiveMessage(
        userId,
        characterId,
        aiResponse,
        followUpMessage.id,
        characterName,
        characterAvatar
      );
      
    } catch (error) {
      console.error('[FollowUpMessages] Error sending follow-up message:', error);
    }
  }, followUpPattern.delay);
}