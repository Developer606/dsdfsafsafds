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
 * Analyze user messages to identify personality traits and interests
 * This helps characters tailor their proactive messages to the user
 */
async function analyzeUserPersonality(userId: number, characterId: string): Promise<{
  traits: Record<string, number>,
  interests: string[],
  activeTimes: number[],
  responsePatterns: any
}> {
  try {
    // Get all user messages from this conversation
    const allMessages = await storage.getUserCharacterMessages(userId, characterId);
    
    // Default values if analysis fails
    const defaultAnalysis = {
      traits: {
        friendliness: 0.5,
        formality: 0.5,
        enthusiasm: 0.5,
        curiosity: 0.5,
        verbosity: 0.5
      },
      interests: [],
      activeTimes: Array(24).fill(0), // Hours of day (0-23)
      responsePatterns: {
        averageResponseTime: 0,
        averageMessageLength: 0,
        topicsInitiated: [],
        questionsAsked: 0
      }
    };
    
    // If no messages, return defaults
    if (!allMessages || allMessages.length < 3) {
      return defaultAnalysis;
    }
    
    // Extract user messages
    const userMessages = allMessages.filter(msg => msg.isUser);
    
    // Message timestamps for timing analysis
    const messageTimes = userMessages.map(msg => new Date(msg.createdAt ?? Date.now()));
    
    // Count active times
    const activeTimes = Array(24).fill(0);
    messageTimes.forEach(time => {
      activeTimes[time.getHours()]++;
    });
    
    // Simple keyword-based interest extraction
    const interestKeywords = [
      'like', 'love', 'enjoy', 'favorite', 'interested in', 'hobby', 'passion',
      'fan of', 'into', 'follow', 'watch', 'play', 'read', 'listen to'
    ];
    
    // Extract potential interests from user messages
    const potentialInterests = new Set<string>();
    const combinedText = userMessages.map(msg => msg.content).join(' ').toLowerCase();
    
    // Simple keyword matching for interests (a more sophisticated NLP approach would be better)
    interestKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        matches.forEach(match => {
          const interestPhrase = match.replace(keyword, '').trim();
          if (interestPhrase.length > 2 && interestPhrase.length < 30) {
            potentialInterests.add(interestPhrase);
          }
        });
      }
    });
    
    // Calculate average message length for verbosity
    const avgMessageLength = userMessages.reduce((sum, msg) => 
      sum + msg.content.length, 0) / userMessages.length;
    
    // Calculate traits based on message patterns
    const traits = {
      friendliness: 0.5,
      formality: 0.5,
      enthusiasm: 0.5,
      curiosity: 0.5,
      verbosity: Math.min(avgMessageLength / 200, 1) // Scale 0-1 based on message length
    };
    
    // Naive sentiment analysis for friendliness/enthusiasm
    const friendlyTerms = ['thanks', 'thank you', 'appreciate', 'happy', 'glad', 'nice', 'good', 'great', 'awesome'];
    const formalTerms = ['would you', 'could you', 'please', 'kindly', 'may I', 'I would like', 'I request'];
    const enthusiasticTerms = ['wow', 'amazing', 'incredible', 'awesome', 'exciting', 'love', 'excellent', '!', '!!'];
    const curiously = ['why', 'how', 'what', 'when', 'who', 'where', '?', 'curious', 'wonder'];
    
    // Count occurrences
    let friendlyCount = 0;
    let formalCount = 0;
    let enthusiasmCount = 0;
    let curiosityCount = 0;
    
    userMessages.forEach(msg => {
      const lowerContent = msg.content.toLowerCase();
      
      friendlyTerms.forEach(term => {
        if (lowerContent.includes(term)) friendlyCount++;
      });
      
      formalTerms.forEach(term => {
        if (lowerContent.includes(term)) formalCount++;
      });
      
      enthusiasticTerms.forEach(term => {
        if (lowerContent.includes(term)) enthusiasmCount++;
      });
      
      curiously.forEach(term => {
        if (lowerContent.includes(term)) curiosityCount++;
      });
    });
    
    // Calculate normalized scores (0-1)
    traits.friendliness = Math.min(friendlyCount / (userMessages.length * 0.5), 1);
    traits.formality = Math.min(formalCount / (userMessages.length * 0.3), 1);
    traits.enthusiasm = Math.min(enthusiasmCount / (userMessages.length * 0.5), 1);
    traits.curiosity = Math.min(curiosityCount / (userMessages.length * 0.5), 1);
    
    // Normalize for at least 0.3 value on each trait
    Object.keys(traits).forEach(key => {
      traits[key] = Math.max(0.3, traits[key]);
    });
    
    // Get the user profile for additional personalization
    const user = await storage.getUserById(userId);
    
    // Incorporate user profile data if available
    if (user && user.bio) {
      // Extract additional interests from bio
      interestKeywords.forEach(keyword => {
        const regex = new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'gi');
        const matches = user.bio.toLowerCase().match(regex);
        if (matches) {
          matches.forEach(match => {
            const interestPhrase = match.replace(keyword, '').trim();
            if (interestPhrase.length > 2 && interestPhrase.length < 30) {
              potentialInterests.add(interestPhrase);
            }
          });
        }
      });
    }
    
    // Count questions asked
    const questionsAsked = userMessages.filter(msg => msg.content.includes('?')).length;
    
    return {
      traits,
      interests: Array.from(potentialInterests).slice(0, 5), // Top 5 interests
      activeTimes,
      responsePatterns: {
        averageResponseTime: 0, // Would need paired messages to calculate
        averageMessageLength: avgMessageLength,
        topicsInitiated: Array.from(potentialInterests).slice(0, 3), // Top 3 for topics
        questionsAsked
      }
    };
  } catch (error) {
    console.error(`[ProactiveMessaging] Error analyzing user personality:`, error);
    // Return default analysis on error
    return {
      traits: {
        friendliness: 0.5,
        formality: 0.5,
        enthusiasm: 0.5,
        curiosity: 0.5,
        verbosity: 0.5
      },
      interests: [],
      activeTimes: Array(24).fill(0),
      responsePatterns: {
        averageResponseTime: 0,
        averageMessageLength: 0,
        topicsInitiated: [],
        questionsAsked: 0
      }
    };
  }
}

/**
 * Generate a personalized prompt based on user's personality analysis and current context
 */
async function generatePersonalizedPrompt(
  conversation: ConversationState,
  character: PredefinedCharacter | CustomCharacter,
  userAnalysis: ReturnType<typeof analyzeUserPersonality> extends Promise<infer T> ? T : never
): Promise<string> {
  // Start with the base prompt
  const basePrompt = selectPrompt(conversation);
  
  // Get the current hour (in user's local time if available, otherwise server time)
  const currentHour = new Date().getHours();
  
  // Check if this is a peak active time for the user
  const isActiveHour = userAnalysis.activeTimes[currentHour] > 
    Math.max(...userAnalysis.activeTimes) * 0.7;
  
  // Adjust prompt based on time context
  let timeContext = '';
  if (currentHour >= 5 && currentHour < 12) {
    timeContext = 'morning';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeContext = 'afternoon';
  } else if (currentHour >= 17 && currentHour < 22) {
    timeContext = 'evening';
  } else {
    timeContext = 'night';
  }
  
  // Build personalization components
  let personalizedComponents = [];
  
  // Add greeting based on time of day
  personalizedComponents.push(`It's ${timeContext} where the user might be.`);
  
  // Add trait-based guidance
  if (userAnalysis.traits.formality > 0.7) {
    personalizedComponents.push("The user tends to be formal, so maintain appropriate politeness.");
  } else if (userAnalysis.traits.formality < 0.4) {
    personalizedComponents.push("The user is casual and informal, so adopt a relaxed conversational style.");
  }
  
  if (userAnalysis.traits.verbosity > 0.7) {
    personalizedComponents.push("The user enjoys detailed responses, so provide thoughtful explanations.");
  } else if (userAnalysis.traits.verbosity < 0.4) {
    personalizedComponents.push("The user prefers concise responses, so keep messages brief and to the point.");
  }
  
  if (userAnalysis.traits.enthusiasm > 0.7) {
    personalizedComponents.push("The user is enthusiastic, so match their energy level.");
  }
  
  if (userAnalysis.traits.curiosity > 0.7) {
    personalizedComponents.push("The user is very curious, so include thought-provoking questions that invite exploration.");
  }
  
  // Add interest-based personalization
  if (userAnalysis.interests.length > 0) {
    // Randomly select one of their interests to potentially bring up
    const randomInterest = userAnalysis.interests[Math.floor(Math.random() * userAnalysis.interests.length)];
    personalizedComponents.push(`If contextually appropriate, consider referencing the user's interest in ${randomInterest}.`);
  }
  
  // Consider activity patterns
  if (isActiveHour) {
    personalizedComponents.push("This is typically an active time for this user, so they may be likely to respond soon.");
  }
  
  // Combine everything into a personalized prompt
  return `${basePrompt}\n\nIncorporate these personalization insights about the user:\n- ${personalizedComponents.join('\n- ')}\n\nStay true to ${character.name}'s personality while adapting to the user's communication style.`;
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
    
    // Analyze user's personality from past messages
    const userAnalysis = await analyzeUserPersonality(userId, characterId);
    
    // Generate a personalized prompt based on user analysis
    const personalizedPrompt = await generatePersonalizedPrompt(conversation, character, userAnalysis);
    
    // Prepare user profile data for personalization, converting null to undefined
    // to match the expected type in the generateCharacterResponse function
    const userProfileData = user ? {
      fullName: user.fullName || undefined,
      age: user.age || undefined,
      gender: user.gender || undefined,
      bio: user.bio || undefined
    } : undefined;
    
    console.log(`[ProactiveMessaging] Generating personalized proactive message from ${character.name} to user ${userId}`);
    
    // Generate the AI response with the personalized proactive prompt
    const aiResponse = await generateCharacterResponse(
      // Type cast to ensure compatibility with Character type
      {
        id: character.id.toString(),
        name: character.name,
        description: character.description,
        persona: character.persona,
        avatar: character.avatar
      },
      personalizedPrompt, // This is the personalized prompt to make the character initiate conversation
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
      
      console.log(`[ProactiveMessaging] Sent personalized proactive message from ${character.name} to user ${userId}`);
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