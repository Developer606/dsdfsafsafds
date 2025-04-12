import { storage } from '../storage';
import { socketService } from '../socket-io-server';
import { generateCharacterResponse } from '../openai';
import { PredefinedCharacter, CustomCharacter, type Message, type User } from '@shared/schema';

// Configuration for different personality types
interface ProactiveConfig {
  inactivityThreshold: number;  // Time in ms before initiating a message
  messageFrequency: number;     // Chance of sending message (0-100)
  followUpChance: number;       // Chance of sending follow-up prompt (0-100)
  maxDailyMessages: number;     // Max proactive messages per day
}

// Character personality types affect how proactive they are
const personalityConfigs: Record<string, ProactiveConfig> = {
  "outgoing": {
    inactivityThreshold: 3 * 60 * 1000, // 3 minutes
    messageFrequency: 70,
    followUpChance: 60,
    maxDailyMessages: 10
  },
  "balanced": {
    inactivityThreshold: 10 * 60 * 1000, // 10 minutes
    messageFrequency: 40,
    followUpChance: 40,
    maxDailyMessages: 5
  },
  "reserved": {
    inactivityThreshold: 20 * 60 * 1000, // 20 minutes
    messageFrequency: 20,
    followUpChance: 20,
    maxDailyMessages: 3
  }
};

// For development/testing, use shorter thresholds
const USE_DEV_THRESHOLDS = process.env.NODE_ENV !== 'production';
if (USE_DEV_THRESHOLDS) {
  personalityConfigs.outgoing.inactivityThreshold = 1 * 60 * 1000; // 1 minute
  personalityConfigs.balanced.inactivityThreshold = 2 * 60 * 1000; // 2 minutes
  personalityConfigs.reserved.inactivityThreshold = 3 * 60 * 1000; // 3 minutes
}

// Track active conversations and when the last message was sent
interface ConversationState {
  userId: number;
  characterId: string;
  lastMessageTime: number;
  lastUserMessageTime: number;
  proactiveMessagesSent: number;
  lastProactiveMessageTime: number;
  characterPersonality: string;
}

// Conversation tracking
const activeConversations = new Map<string, ConversationState>();

// Type for message generation prompts
type ProactivePromptType = 
  | 'greeting'
  | 'conversation_starter'
  | 'follow_up'
  | 'check_in'
  | 'share_thought';

// Prompts for generating proactive messages
const proactivePrompts: Record<ProactivePromptType, string[]> = {
  greeting: [
    "The user hasn't messaged in a while. Send a friendly greeting to start a conversation.",
    "You haven't talked to the user today. Send a casual hello message.",
    "Initiate a conversation with the user with a warm greeting that fits your personality."
  ],
  conversation_starter: [
    "Start a new conversation by asking the user about their day or something interesting.",
    "Share something interesting about yourself and ask the user a related question.",
    "Bring up a topic that might interest the user based on their profile and previous conversations."
  ],
  follow_up: [
    "The conversation died down. Send a follow-up message about something previously discussed.",
    "Ask a follow-up question about something the user mentioned earlier in your conversation.",
    "Continue the previous conversation thread with an interesting observation or question."
  ],
  check_in: [
    "Check in with the user to see how they're doing today.",
    "Ask the user if anything interesting happened since you last chatted.",
    "Send a caring message checking in on how the user is feeling."
  ],
  share_thought: [
    "Share a random thought or observation that just occurred to you.",
    "Tell the user something you were thinking about that reminds you of them.",
    "Share something you're excited about or looking forward to."
  ]
};

/**
 * Get the appropriate personality type for a character based on their persona
 */
function determineCharacterPersonality(character: PredefinedCharacter | CustomCharacter): string {
  const persona = character.persona.toLowerCase();
  
  // Detect personality traits from persona description
  if (
    persona.includes('shy') || 
    persona.includes('quiet') || 
    persona.includes('reserved') || 
    persona.includes('introvert') ||
    persona.includes('thoughtful') ||
    persona.includes('calm')
  ) {
    return 'reserved';
  }
  
  if (
    persona.includes('outgoing') || 
    persona.includes('energetic') || 
    persona.includes('bubbly') || 
    persona.includes('extrovert') ||
    persona.includes('cheerful') ||
    persona.includes('talkative')
  ) {
    return 'outgoing';
  }
  
  // Default personality
  return 'balanced';
}

/**
 * Generate a conversation key for tracking
 */
function getConversationKey(userId: number, characterId: string): string {
  return `${userId}-${characterId}`;
}

/**
 * Register a new conversation or update existing one
 */
export function trackConversation(
  userId: number, 
  characterId: string, 
  isUserMessage: boolean,
  character?: PredefinedCharacter | CustomCharacter
): void {
  const conversationKey = getConversationKey(userId, characterId);
  const now = Date.now();
  
  if (activeConversations.has(conversationKey)) {
    // Update existing conversation
    const conversation = activeConversations.get(conversationKey)!;
    conversation.lastMessageTime = now;
    
    if (isUserMessage) {
      conversation.lastUserMessageTime = now;
    }
  } else if (character) {
    // Create new conversation tracking
    const personality = determineCharacterPersonality(character);
    
    activeConversations.set(conversationKey, {
      userId,
      characterId,
      lastMessageTime: now,
      lastUserMessageTime: isUserMessage ? now : 0,
      proactiveMessagesSent: 0,
      lastProactiveMessageTime: 0,
      characterPersonality: personality
    });
    
    console.log(`[ProactiveMessaging] Started tracking conversation between user ${userId} and character ${characterId} (${personality})`);
  }
}

/**
 * Check if a character should send a proactive message
 */
function shouldSendProactiveMessage(conversation: ConversationState): boolean {
  const now = Date.now();
  const config = personalityConfigs[conversation.characterPersonality] || personalityConfigs.balanced;
  
  // Check if enough time has passed since the last user message
  const timeSinceLastUserMessage = now - conversation.lastUserMessageTime;
  if (timeSinceLastUserMessage < config.inactivityThreshold) {
    return false;
  }
  
  // Check if enough time has passed since the last proactive message
  const timeSinceLastProactiveMessage = now - conversation.lastProactiveMessageTime;
  if (timeSinceLastProactiveMessage < config.inactivityThreshold * 1.5) {
    return false;
  }
  
  // Check if we've exceeded the daily message limit
  if (conversation.proactiveMessagesSent >= config.maxDailyMessages) {
    return false;
  }
  
  // Random chance based on character personality
  const randomChance = Math.random() * 100;
  return randomChance <= config.messageFrequency;
}

/**
 * Select an appropriate prompt for generating a proactive message
 */
function selectPrompt(conversation: ConversationState): string {
  const promptTypes: ProactivePromptType[] = ['greeting', 'conversation_starter', 'follow_up', 'check_in', 'share_thought'];
  
  // If it's been a very long time, prioritize greetings and check-ins
  const now = Date.now();
  const hoursSinceLastMessage = (now - conversation.lastMessageTime) / (1000 * 60 * 60);
  
  let selectedTypes: ProactivePromptType[];
  
  if (hoursSinceLastMessage > 24) {
    // It's been more than a day, use greeting or check-in
    selectedTypes = ['greeting', 'check_in'];
  } else if (hoursSinceLastMessage > 12) {
    // It's been more than 12 hours
    selectedTypes = ['greeting', 'check_in', 'conversation_starter'];
  } else if (conversation.lastUserMessageTime > 0) {
    // We have previous conversations, can use follow-ups
    selectedTypes = promptTypes;
  } else {
    // No previous user messages, avoid follow-ups
    selectedTypes = ['greeting', 'conversation_starter', 'share_thought', 'check_in'];
  }
  
  // Randomly select a prompt type from our filtered list
  const promptType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
  
  // Get all prompts of that type and randomly select one
  const prompts = proactivePrompts[promptType];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Generate and send a proactive message from a character
 */
async function sendProactiveMessage(conversation: ConversationState): Promise<void> {
  try {
    const { userId, characterId } = conversation;
    
    // Get character data
    let character: PredefinedCharacter | CustomCharacter | null = null;
    
    try {
      if (characterId.startsWith('custom_')) {
        const customId = parseInt(characterId.replace('custom_', ''));
        const customChar = await storage.getCustomCharacterById(customId);
        if (customChar) character = customChar;
      } else {
        const predefinedChar = await storage.getPredefinedCharacterById(characterId);
        if (predefinedChar) character = predefinedChar;
      }
      
      if (!character) {
        console.error(`[ProactiveMessaging] Character ${characterId} not found`);
        return;
      }
    } catch (error) {
      console.error(`[ProactiveMessaging] Error getting character ${characterId}:`, error);
      return;
    }
    
    // Get user profile data for personalization
    const user = await storage.getUserById(userId);
    if (!user) {
      console.error(`[ProactiveMessaging] User ${userId} not found`);
      return;
    }
    
    // Get conversation history
    const messages = await storage.getUserCharacterMessages(userId, characterId);
    const chatHistory = messages
      .slice(-10) // Use last 10 messages
      .map(msg => `${msg.isUser ? 'User' : character!.name}: ${msg.content}`)
      .join('\n');
    
    // Select a prompt for the AI
    const prompt = selectPrompt(conversation);
    
    // Prepare user profile data for personalization, converting null to undefined
    // to match the expected type in the generateCharacterResponse function
    const userProfileData = user ? {
      fullName: user.fullName || undefined,
      age: user.age || undefined,
      gender: user.gender || undefined,
      bio: user.bio || undefined
    } : undefined;
    
    console.log(`[ProactiveMessaging] Generating proactive message from ${character.name} to user ${userId}`);
    
    // Generate the AI response with the proactive prompt
    const aiResponse = await generateCharacterResponse(
      // Type cast to ensure compatibility with Character type
      {
        id: character.id.toString(),
        name: character.name,
        description: character.description,
        persona: character.persona,
        avatar: character.avatar
      },
      prompt, // This is the prompt to make the character initiate conversation
      chatHistory,
      'english', // Default language 
      undefined, // No specific script
      userProfileData
    );
    
    // Store the message in the database
    const aiMessage = await storage.createMessage({
      userId: userId,
      characterId: characterId,
      content: aiResponse,
      isUser: false,
      language: 'english',
      script: undefined,
    });
    
    // Update conversation tracking
    conversation.lastMessageTime = Date.now();
    conversation.lastProactiveMessageTime = Date.now();
    conversation.proactiveMessagesSent += 1;
    
    // Emit the message via Socket.IO
    const io = socketService.getIO();
    if (io) {
      // Find the socket for this user
      io.to(`user_${userId}`).emit('character_message', {
        message: aiMessage,
        character: {
          id: character.id,
          name: character.name,
          avatar: character.avatar
        }
      });
      
      console.log(`[ProactiveMessaging] Sent proactive message from ${character.name} to user ${userId}`);
    } else {
      console.error('[ProactiveMessaging] Socket.IO not initialized');
    }
    
  } catch (error) {
    console.error('[ProactiveMessaging] Error sending proactive message:', error);
  }
}

/**
 * Scan all active conversations and send proactive messages where appropriate
 */
async function scanConversations(): Promise<void> {
  // Make a copy of the keys to prevent issues if the map changes during iteration
  const conversationKeys = [...activeConversations.keys()];
  
  for (const key of conversationKeys) {
    const conversation = activeConversations.get(key);
    if (!conversation) continue;
    
    // Skip if user has been active recently
    if (shouldSendProactiveMessage(conversation)) {
      await sendProactiveMessage(conversation);
    }
  }
}

/**
 * Clear old conversations that have been inactive for too long
 */
function cleanupInactiveConversations(): void {
  const now = Date.now();
  const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, conversation] of activeConversations.entries()) {
    const timeSinceLastMessage = now - conversation.lastMessageTime;
    
    if (timeSinceLastMessage > maxInactiveTime) {
      activeConversations.delete(key);
      console.log(`[ProactiveMessaging] Removed inactive conversation: ${key}`);
    }
  }
}

/**
 * Reset daily message counters
 */
function resetDailyCounters(): void {
  for (const conversation of activeConversations.values()) {
    conversation.proactiveMessagesSent = 0;
  }
  console.log('[ProactiveMessaging] Reset daily message counters');
}

/**
 * Initialize the proactive messaging service
 */
/**
 * Manually test sending a proactive message for a specific character
 * This can be used for testing purposes via API
 */
export async function testProactiveMessage(userId: number, characterId: string): Promise<boolean> {
  try {
    const key = getConversationKey(userId, characterId);
    let conversation = activeConversations.get(key);
    
    // If we don't have a tracking entry for this conversation, let's create one
    if (!conversation) {
      let character: PredefinedCharacter | CustomCharacter | null = null;
      
      if (characterId.startsWith('custom_')) {
        const customId = parseInt(characterId.replace('custom_', ''));
        character = await storage.getCustomCharacterById(customId);
      } else {
        character = await storage.getPredefinedCharacterById(characterId);
      }
      
      if (!character) {
        console.error(`[ProactiveMessaging] Test failed: Character ${characterId} not found`);
        return false;
      }
      
      // Create conversation tracking entry
      trackConversation(userId, characterId, false, character);
      conversation = activeConversations.get(key);
      
      if (!conversation) {
        console.error(`[ProactiveMessaging] Test failed: Could not create conversation tracking`);
        return false; 
      }
    }
    
    // Force the conversation to be eligible for a proactive message
    conversation.lastUserMessageTime = Date.now() - (60 * 60 * 1000); // Set last user message to 1 hour ago
    
    // Attempt to send the message
    await sendProactiveMessage(conversation);
    return true;
  } catch (error) {
    console.error(`[ProactiveMessaging] Test error:`, error);
    return false;
  }
}

export function initializeProactiveMessaging(): void {
  // Scan for proactive message opportunities every minute
  setInterval(scanConversations, 60 * 1000);
  
  // Clean up inactive conversations every hour
  setInterval(cleanupInactiveConversations, 60 * 60 * 1000);
  
  // Reset daily counters at midnight
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      resetDailyCounters();
    }
  }, 60 * 1000);
  
  console.log('[ProactiveMessaging] Service initialized');
}