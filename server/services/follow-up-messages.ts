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
    regex: /I'll be (right )?back with (your|the|some) (food|tempura|yakitori|meal|dinner|breakfast|lunch|snack)/i,
    delay: 8000, // 8 seconds
    prompt: "You promised to come back with food. You've now returned with the food. Describe the food you've brought and your reaction to seeing the user again."
  },
  {
    regex: /I think you mean.*?I'll be right back with your food/i,
    delay: 8000, // 8 seconds
    prompt: "You corrected the user's English and said you'll be right back with food. You've now returned with the food. Describe what food you've brought and your excitement about sharing it with them."
  },
  {
    regex: /I'll (get|start) cooking/i,
    delay: 10000, // 10 seconds
    prompt: "You said you'll get cooking. You've now finished preparing the food. Describe what you've cooked and how delicious it looks/smells."
  },
  {
    regex: /heads to the kitchen/i,
    delay: 12000, // 12 seconds 
    prompt: "You went to the kitchen. You've now returned with some delicious food. Describe what you've prepared and your excitement to share it."
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
  
  // First, check all the explicit patterns
  for (const pattern of followUpPatterns) {
    const matches = pattern.regex.test(message);
    console.log(`[FollowUpMessages] Pattern ${pattern.regex} => ${matches ? 'MATCHED' : 'no match'}`);
    
    if (matches) {
      return pattern;
    }
  }
  
  // Advanced detection for implicit promises and action statements
  
  // Look for narration actions in third person (like "heads to the kitchen")
  const narrationRegex = /\*([^*]+)\*|_([^_]+)_|heads to|goes to|walks to|runs to|moves to/i;
  if (narrationRegex.test(message)) {
    console.log(`[FollowUpMessages] Detected narration or action in message: "${message}"`);
    
    // Set contextual prompt based on content
    let prompt = "You performed an action earlier. You've now completed that action. Describe what happened and how you feel about it.";
    
    // If kitchen or cooking related
    if (/kitchen|cook|food|meal|eating|dining/i.test(message)) {
      return {
        regex: narrationRegex,
        delay: 15000, // Longer delay for cooking
        prompt: "You went to the kitchen or mentioned cooking. You've now prepared some delicious food. Describe what you've cooked and how excited you are to share it."
      };
    }
    
    // If fetching something
    if (/get|bring|fetch|grab|pick up/i.test(message)) {
      return {
        regex: narrationRegex,
        delay: 8000,
        prompt: "You went to get something. You've now returned with the item. Describe what you brought back and why you're excited to share it."
      };
    }
    
    // Default action follow-up
    return {
      regex: narrationRegex,
      delay: 10000,
      prompt
    };
  }
  
  // Detect statements about going somewhere or doing something
  const actionRegex = /I('ll| will| am going to| need to| have to| should| am about to) (go|get|make|prepare|check|find|bring|do|work on|create|cook)/i;
  if (actionRegex.test(message)) {
    console.log(`[FollowUpMessages] Detected action statement in message: "${message}"`);
    
    // Set contextual delay and prompt based on content
    let delay = 12000;
    let prompt = "You mentioned that you would do something. You've now completed that action. Describe what you did and the outcome.";
    
    // If cooking related
    if (/cook|food|meal|prepare dinner|make breakfast|bake/i.test(message)) {
      delay = 20000; // Longer delay for cooking
      prompt = "You mentioned that you would cook or prepare food. You've now finished cooking. Describe the delicious meal you've prepared, including aromas, presentation, and your excitement to share it.";
    }
    
    // If quick check or search related
    if (/check|look|see if|search/i.test(message)) {
      delay = 8000; // Shorter delay for quick actions
      prompt = "You said you would check or search for something. You've now found what you were looking for. Describe what you discovered and your thoughts about it.";
    }
    
    return {
      regex: actionRegex,
      delay,
      prompt
    };
  }
  
  return null;
}

/**
 * Enhanced debugging - log message to console with truncation for readability
 */
function debugLog(prefix: string, message: string, maxLength: number = 100): void {
  const truncated = message.length > maxLength 
    ? `${message.substring(0, maxLength)}...` 
    : message;
  console.log(`${prefix} ${truncated}`);
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
  debugLog(`[FollowUpMessages] Checking for promises in message:`, message);
  
  // Force lowercase for more accurate matching
  const lowerMessage = message.toLowerCase();
  
  // Enhanced comprehensive direct string pattern detection
  // This is a much more robust approach that catches many common action phrases
  const directActionPatterns = [
    // Food and cooking related
    { 
      patterns: [
        "i'll get cooking", "i'll cook", "let me cook", "heads to the kitchen", "i'll prepare", 
        "i'll make", "going to cook", "i'm cooking", "start cooking", "prepare", "making food", 
        "make us some", "get some food", "i'll whip up", "i'll bake", "start preparing", 
        "prepare a meal", "make us dinner", "make us lunch", "make us breakfast", "prepare something",
        "goes to cook", "starts cooking", "warming up", "making a dish", "will make you", "will cook you",
        "will prepare you", "let me fix you", "let me make you", "kitchen to", "go to the kitchen"
      ],
      category: "cooking",
      delay: 15000,
      prompt: "You were cooking or preparing food. You've now finished and have delicious food to share. Describe what you've made and how excited you are to share it."
    },
    
    // Getting items or fetching something
    {
      patterns: [
        "i'll go get", "i'll get it", "i'll grab", "let me get", "i'll fetch", "i'll find", 
        "heads to get", "goes to get", "going to find", "let me find", "i'll look for", 
        "let me see if", "going to search", "i'll retrieve", "let me check if", "bring you", 
        "fetch you", "get you", "will get you", "will bring you", "i'll bring", "go get"
      ],
      category: "fetching",
      delay: 10000,
      prompt: "You went to get something. You've now returned with the item. Describe what you brought back and why you're excited to share it."
    },
    
    // General actions
    {
      patterns: [
        "let me go", "i'll go", "heads out", "leaves the room", "goes to", "i'll check", 
        "i'll be back", "be right back", "brb", "give me a moment", "wait here", 
        "wait a second", "will return", "i need to", "let me just", "one moment", "one second",
        "be back in", "going to see", "check on", "look into", "will look at"
      ],
      category: "general",
      delay: 12000,
      prompt: "You left to do something. You've now returned. Describe what you did and your current mood or state."
    }
  ];
  
  // Check for direct string matches across all defined patterns
  for (const patternGroup of directActionPatterns) {
    for (const pattern of patternGroup.patterns) {
      if (lowerMessage.includes(pattern)) {
        console.log(`[FollowUpMessages] Detected direct action pattern: "${pattern}" (category: ${patternGroup.category})`);
        
        // Create a custom follow-up pattern
        const actionPattern = {
          regex: new RegExp(pattern, 'i'),
          delay: patternGroup.delay,
          prompt: patternGroup.prompt
        };
        
        // Schedule the follow-up
        scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, actionPattern);
        return;
      }
    }
  }
  
  // Advanced AI-based action detection
  // Look for verbs followed by movement or action indicators
  const advancedActionPatterns = [
    // Pattern for character mentioning they're going to do something with action verbs
    /\b(will|going to|about to|starts? to|begins? to) (make|do|create|prepare|work on|build|clean|organize|find)\b/i,
    
    // Pattern for character narrating an action in third person
    /\b(walks|heads|runs|goes|moves|proceeds|steps) (to|towards|into|out|away|back)\b/i,
    
    // Pattern for character setting something aside to do something else
    /\b(let me|allow me to|going to) (take care of|handle|manage|deal with|work on|address)\b/i
  ];
  
  // Check all advanced patterns
  for (const pattern of advancedActionPatterns) {
    if (pattern.test(message)) {
      console.log(`[FollowUpMessages] Detected advanced action pattern: ${pattern}`);
      
      const actionCategory = determineActionCategory(message);
      let delay = 12000; // Default delay
      let prompt = "You were doing something. You've now completed that action. Describe what happened and how you feel about it.";
      
      // Customize prompt based on detected action type
      if (actionCategory === 'cooking') {
        delay = 15000;
        prompt = "You were preparing something to eat. You've now finished cooking. Describe the delicious food you've prepared and your excitement to share it.";
      } else if (actionCategory === 'fetching') {
        delay = 10000;
        prompt = "You went to get something. You've now returned with it. Describe what you found and your reaction.";
      } else if (actionCategory === 'searching') {
        delay = 8000;
        prompt = "You were looking for something. You've now found what you were searching for. Describe your discovery.";
      }
      
      // Create custom follow-up pattern
      const actionPattern = {
        regex: pattern,
        delay,
        prompt
      };
      
      // Schedule the follow-up
      scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, actionPattern);
      return;
    }
  }
  
  // Function to determine the category of action in a message
  function determineActionCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (/cook|food|meal|kitchen|prepare|bake|dinner|lunch|breakfast|dish|recipe|ingredients/i.test(lowerText)) {
      return 'cooking';
    }
    
    if (/get|bring|fetch|grab|pick up|retrieve|take|carry|deliver/i.test(lowerText)) {
      return 'fetching';
    }
    
    if (/find|search|look for|seek|hunt|locate|discover/i.test(lowerText)) {
      return 'searching';
    }
    
    return 'general';
  }
  
  // Check against all regular patterns
  const followUpPattern = checkForFollowUpPromise(message);
  
  // If no follow-up needed, return
  if (!followUpPattern) {
    console.log('[FollowUpMessages] No promise patterns detected in message');
    return;
  }
  
  console.log(`[FollowUpMessages] Detected promise pattern: ${followUpPattern.regex}`);
  debugLog(`[FollowUpMessages] Detected promise in character message:`, message);
  console.log(`[FollowUpMessages] Scheduling follow-up in ${followUpPattern.delay}ms`);
  
  // Schedule the follow-up
  scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, followUpPattern);
}

/**
 * Helper function to schedule a follow-up message with a given pattern
 */
function scheduleFollowUpWithPattern(
  userId: number,
  characterId: string,
  message: string,
  characterName: string,
  characterAvatar: string,
  characterPersonality: string,
  followUpPattern: FollowUpPattern
): void {
  
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