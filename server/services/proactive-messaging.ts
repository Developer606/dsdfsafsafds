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
  personalityConfigs.outgoing.inactivityThreshold = 45 * 1000; // 45 seconds
  personalityConfigs.balanced.inactivityThreshold = 1 * 60 * 1000; // 1 minute
  personalityConfigs.reserved.inactivityThreshold = 90 * 1000; // 90 seconds
  
  // Increase message frequency for faster testing
  personalityConfigs.outgoing.messageFrequency = 80;
  personalityConfigs.balanced.messageFrequency = 60;
  personalityConfigs.reserved.messageFrequency = 40;
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
 * Dynamic timing parameters for more human-like conversation patterns
 */
interface DynamicTiming {
  // Base likelihood percentage for sending message (0-100)
  baseLikelihood: number;
  
  // Hour weights (0-23) - times when characters are more likely to message
  hourWeights: number[];
  
  // Day weights (0-6, Sunday-Saturday)
  dayWeights: number[];
  
  // Bonus for user active times based on past history
  userActiveTimeBonus: number;
  
  // Factors that influence timing
  timeFactors: {
    // If conversation was intense (many messages), shorter delay before proactive message
    conversationIntensityFactor: number;
    // Length of the previous messages affects timing
    previousMessageLengthFactor: number;
  };
}

/**
 * Provides timing parameters based on character personality and conversation context
 */
async function getDynamicTimingParameters(
  conversation: ConversationState, 
  characterId: string
): Promise<DynamicTiming> {
  const config = personalityConfigs[conversation.characterPersonality] || personalityConfigs.balanced;
  
  // Get current hour and day
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0-6, Sunday-Saturday
  
  // Default timing parameters
  const defaultTiming: DynamicTiming = {
    baseLikelihood: config.messageFrequency,
    hourWeights: Array(24).fill(1), // Neutral hour weights
    dayWeights: Array(7).fill(1),   // Neutral day weights
    userActiveTimeBonus: 20,        // 20% bonus for user's active times
    timeFactors: {
      conversationIntensityFactor: 0.8,
      previousMessageLengthFactor: 0.7
    }
  };
  
  try {
    // Get messages for analysis
    const { userId } = conversation;
    const messages = await storage.getUserCharacterMessages(userId, characterId);
    
    if (!messages || messages.length < 5) {
      return defaultTiming; // Not enough data for personalized timing
    }
    
    // Analyze message timing patterns
    const messageTimes = messages.map(msg => {
      if (msg.timestamp instanceof Date) {
        return msg.timestamp;
      } else {
        return new Date(msg.timestamp || Date.now());
      }
    });
    
    // Count messages by hour
    const messagesByHour = Array(24).fill(0);
    messageTimes.forEach(time => {
      messagesByHour[time.getHours()]++;
    });
    
    // Count messages by day
    const messagesByDay = Array(7).fill(0);
    messageTimes.forEach(time => {
      messagesByDay[time.getDay()]++;
    });
    
    // Convert counts to weights (normalize to 0.5-1.5 range)
    const hourWeights = messagesByHour.map(count => {
      const max = Math.max(...messagesByHour);
      return max > 0 ? 0.5 + (count / max) : 1;
    });
    
    const dayWeights = messagesByDay.map(count => {
      const max = Math.max(...messagesByDay);
      return max > 0 ? 0.5 + (count / max) : 1;
    });
    
    // Get conversation intensity (number of messages in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(msg => {
      if (msg.timestamp instanceof Date) {
        return msg.timestamp.getTime() > oneDayAgo;
      } else {
        return new Date(msg.timestamp || Date.now()).getTime() > oneDayAgo;
      }
    });
    const conversationIntensity = recentMessages.length;
    
    // Calculate the average length of last few messages to gauge conversation depth
    const lastFewMessages = messages.slice(-5);
    const avgMessageLength = lastFewMessages.reduce((sum, msg) => sum + msg.content.length, 0) / lastFewMessages.length;
    
    // Set conversation intensity factor (more intense = more likely to continue)
    const conversationIntensityFactor = Math.min(1.5, 0.5 + (conversationIntensity / 20));
    
    // Adjust message length factor (longer messages tend to need more time to respond)
    const previousMessageLengthFactor = avgMessageLength > 200 ? 0.7 : 1.0;
    
    return {
      baseLikelihood: config.messageFrequency,
      hourWeights,
      dayWeights,
      userActiveTimeBonus: 20,
      timeFactors: {
        conversationIntensityFactor,
        previousMessageLengthFactor
      }
    };
  } catch (error) {
    console.error(`[ProactiveMessaging] Error getting dynamic timing parameters:`, error);
    return defaultTiming;
  }
}

/**
 * Check if a character should send a proactive message with enhanced dynamic timing
 */
async function shouldSendProactiveMessage(conversation: ConversationState): Promise<boolean> {
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
  
  // Get dynamic timing parameters
  const dynamicTiming = await getDynamicTimingParameters(conversation, conversation.characterId);
  
  // Get current hour and day
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const currentDay = currentDate.getDay();
  
  // Calculate base likelihood adjusted by time weights
  let likelihood = dynamicTiming.baseLikelihood;
  
  // Adjust by hour and day weights
  likelihood *= dynamicTiming.hourWeights[currentHour];
  likelihood *= dynamicTiming.dayWeights[currentDay];
  
  // Adjust by conversation factors
  likelihood *= dynamicTiming.timeFactors.conversationIntensityFactor;
  likelihood *= dynamicTiming.timeFactors.previousMessageLengthFactor;
  
  // Check for user's typical active time
  const isActiveHour = dynamicTiming.hourWeights[currentHour] > 
    (Math.max(...dynamicTiming.hourWeights) * 0.8);
  
  if (isActiveHour) {
    likelihood += dynamicTiming.userActiveTimeBonus;
  }
  
  // Cap likelihood at 95% - never fully certain
  likelihood = Math.min(likelihood, 95);
  
  // Random chance based on adjusted likelihood
  const randomChance = Math.random() * 100;
  const shouldSend = randomChance <= likelihood;
  
  // Log decision factors for debugging
  if (shouldSend) {
    console.log(`[ProactiveMessaging] Deciding to send message to user ${conversation.userId}:`);
    console.log(`- Base likelihood: ${dynamicTiming.baseLikelihood.toFixed(1)}%`);
    console.log(`- Hour weight (${currentHour}): ${dynamicTiming.hourWeights[currentHour].toFixed(2)}`);
    console.log(`- Day weight (${currentDay}): ${dynamicTiming.dayWeights[currentDay].toFixed(2)}`);
    console.log(`- Conversation intensity: ${dynamicTiming.timeFactors.conversationIntensityFactor.toFixed(2)}`);
    console.log(`- Final likelihood: ${likelihood.toFixed(1)}%`);
    console.log(`- Random roll: ${randomChance.toFixed(1)}`);
  }
  
  return shouldSend;
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
  responsePatterns: any,
  emotionalState: string,
  topics: string[],
  contextualMemory: string[],
  conversationStyle: Record<string, number>
}> {
  try {
    console.log(`[ProactiveMessaging] Analyzing personality for user ${userId} with character ${characterId}`);
    
    // Get all user messages from this conversation from messages.db
    const allMessages = await storage.getUserCharacterMessages(userId, characterId);
    
    // Default values if analysis fails
    const defaultAnalysis = {
      traits: {
        friendliness: 0.5,
        formality: 0.5,
        enthusiasm: 0.5,
        curiosity: 0.5,
        verbosity: 0.5,
        consistency: 0.5,
        openness: 0.5,
        politeness: 0.5
      },
      interests: [],
      activeTimes: Array(24).fill(0), // Hours of day (0-23)
      responsePatterns: {
        averageResponseTime: 0,
        averageMessageLength: 0,
        topicsInitiated: [],
        questionsAsked: 0,
        responseConsistency: 0.5,
        messageFrequency: "moderate"
      },
      emotionalState: "neutral",
      topics: [],
      contextualMemory: [],
      conversationStyle: {
        directness: 0.5,
        humor: 0.5,
        emotionalExpression: 0.5,
        engagement: 0.5
      }
    };
    
    // If no messages, return defaults
    if (!allMessages || allMessages.length < 3) {
      console.log(`[ProactiveMessaging] Not enough messages (${allMessages?.length || 0}) for user ${userId}, using default personality`);
      return defaultAnalysis;
    }
    
    console.log(`[ProactiveMessaging] Found ${allMessages.length} messages for analysis`);
    
    // Extract user messages
    const userMessages = allMessages.filter(msg => msg.isUser);
    const characterMessages = allMessages.filter(msg => !msg.isUser);
    
    // Message timestamps for timing analysis - handle the field correctly
    const messageTimes = userMessages.map(msg => {
      // Check timestamp with proper fallback
      if (msg.timestamp instanceof Date) {
        return msg.timestamp;
      } else if (typeof msg.timestamp === 'string' || typeof msg.timestamp === 'number') {
        return new Date(msg.timestamp);
      } else {
        return new Date();
      }
    });
    
    // Count active times
    const activeTimes = Array(24).fill(0);
    messageTimes.forEach(time => {
      activeTimes[time.getHours()]++;
    });
    
    // Enhanced interest and topic extraction
    const interestKeywords = [
      'like', 'love', 'enjoy', 'favorite', 'interested in', 'hobby', 'passion',
      'fan of', 'into', 'follow', 'watch', 'play', 'read', 'listen to',
      'obsessed with', 'addicted to', 'collect', 'fascinated by', 'study'
    ];
    
    // Topic extraction related to conversation context
    const topicIndicators = [
      'about', 'regarding', 'concerning', 'on the topic of', 'talking about',
      'discussing', 'think of', 'opinion on', 'thoughts on', 'feel about'
    ];
    
    // Extract potential interests and topics
    const potentialInterests = new Set<string>();
    const potentialTopics = new Set<string>();
    const combinedText = userMessages.map(msg => msg.content).join(' ').toLowerCase();
    
    // Track conversation memory for contextual relevance
    const significantExchanges: string[] = [];
    
    // Advanced pattern matching for interests
    interestKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}\\s+([\\w\\s]+?)(?:\\.|,|!|\\?|$|\\s\\s)`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        matches.forEach(match => {
          const interestPhrase = match.replace(new RegExp(`${keyword}\\s+`, 'i'), '').trim()
            .replace(/[.,!?]$/, ''); // Remove trailing punctuation
          if (interestPhrase.length > 2 && interestPhrase.length < 40) {
            potentialInterests.add(interestPhrase);
          }
        });
      }
    });
    
    // Extract topics from conversations
    topicIndicators.forEach(indicator => {
      const regex = new RegExp(`${indicator}\\s+([\\w\\s]+?)(?:\\.|,|!|\\?|$|\\s\\s)`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        matches.forEach(match => {
          const topicPhrase = match.replace(new RegExp(`${indicator}\\s+`, 'i'), '').trim()
            .replace(/[.,!?]$/, ''); // Remove trailing punctuation
          if (topicPhrase.length > 2 && topicPhrase.length < 40) {
            potentialTopics.add(topicPhrase);
          }
        });
      }
    });
    
    // Extract significant exchanges from conversation
    if (allMessages.length >= 6) {
      // Get some representative exchanges
      for (let i = 0; i < allMessages.length - 1; i += 2) {
        if (i + 1 < allMessages.length) {
          const userMsg = allMessages[i].isUser ? allMessages[i].content : allMessages[i+1].content;
          const charMsg = allMessages[i].isUser ? allMessages[i+1].content : allMessages[i].content;
          
          // Simplify and truncate messages for memory
          const simplified = `User: ${userMsg.substring(0, 50)}${userMsg.length > 50 ? '...' : ''}\nCharacter: ${charMsg.substring(0, 50)}${charMsg.length > 50 ? '...' : ''}`;
          significantExchanges.push(simplified);
        }
      }
    }
    
    // Calculate average message length for verbosity
    const avgMessageLength = userMessages.reduce((sum, msg) => 
      sum + msg.content.length, 0) / userMessages.length;
    
    // More sophisticated traits analysis
    const traits = {
      friendliness: 0.5,
      formality: 0.5,
      enthusiasm: 0.5,
      curiosity: 0.5,
      verbosity: Math.min(avgMessageLength / 200, 1), // Scale 0-1 based on message length
      consistency: 0.5,
      openness: 0.5,
      politeness: 0.5
    };
    
    // Enhanced sentiment analysis
    const friendlyTerms = ['thanks', 'thank you', 'appreciate', 'happy', 'glad', 'nice', 'good', 'great', 'awesome', 'friend', 'lovely'];
    const formalTerms = ['would you', 'could you', 'please', 'kindly', 'may I', 'I would like', 'I request', 'if you don\'t mind', 'pardon'];
    const enthusiasticTerms = ['wow', 'amazing', 'incredible', 'awesome', 'exciting', 'love', 'excellent', '!', '!!', 'omg', 'cool', 'fantastic'];
    const curiousTerms = ['why', 'how', 'what', 'when', 'who', 'where', '?', 'curious', 'wonder', 'interested', 'tell me more', 'explain'];
    const openTerms = ['maybe', 'perhaps', 'possibly', 'consider', 'option', 'alternative', 'different view', 'perspective'];
    const politeTerms = ['please', 'thank you', 'thanks', 'appreciate', 'grateful', 'sorry', 'excuse me'];
    
    // Humor and directness indicators
    const humorTerms = ['lol', 'haha', 'funny', 'joke', 'lmao', 'rofl', '😂', '🤣', 'hilarious', 'laugh'];
    const directTerms = ['straight', 'honest', 'directly', 'frankly', 'to be clear', 'simply put', 'bottom line'];
    
    // Emotional state indicators
    const happyTerms = ['happy', 'joy', 'excited', 'glad', 'wonderful', 'delighted', '😊', '😄', 'thrilled'];
    const sadTerms = ['sad', 'unhappy', 'disappointed', 'upset', 'depressed', 'sorry', '😢', '😞', 'regret'];
    const angryTerms = ['angry', 'upset', 'annoyed', 'frustrated', 'mad', '😠', 'hate', 'terrible'];
    const anxiousTerms = ['worried', 'anxious', 'nervous', 'stress', 'concerned', 'fear', 'afraid', 'scary'];
    
    // Count occurrences with more sophisticated patterns
    let friendlyCount = 0;
    let formalCount = 0;
    let enthusiasmCount = 0;
    let curiosityCount = 0;
    let opennessCount = 0;
    let politenessCount = 0;
    let humorCount = 0;
    let directnessCount = 0;
    
    // Emotional state tracking
    let happyCount = 0;
    let sadCount = 0;
    let angryCount = 0;
    let anxiousCount = 0;
    
    // Enhanced analysis using both message content and patterns
    userMessages.forEach(msg => {
      const lowerContent = msg.content.toLowerCase();
      
      // Track trait indicators
      friendlyTerms.forEach(term => {
        if (lowerContent.includes(term)) friendlyCount++;
      });
      
      formalTerms.forEach(term => {
        if (lowerContent.includes(term)) formalCount++;
      });
      
      enthusiasticTerms.forEach(term => {
        if (lowerContent.includes(term)) enthusiasmCount++;
      });
      
      curiousTerms.forEach(term => {
        if (lowerContent.includes(term)) curiosityCount++;
      });
      
      openTerms.forEach(term => {
        if (lowerContent.includes(term)) opennessCount++;
      });
      
      politeTerms.forEach(term => {
        if (lowerContent.includes(term)) politenessCount++;
      });
      
      // Humor and directness
      humorTerms.forEach(term => {
        if (lowerContent.includes(term)) humorCount++;
      });
      
      directTerms.forEach(term => {
        if (lowerContent.includes(term)) directnessCount++;
      });
      
      // Emotional states
      happyTerms.forEach(term => {
        if (lowerContent.includes(term)) happyCount++;
      });
      
      sadTerms.forEach(term => {
        if (lowerContent.includes(term)) sadCount++;
      });
      
      angryTerms.forEach(term => {
        if (lowerContent.includes(term)) angryCount++;
      });
      
      anxiousTerms.forEach(term => {
        if (lowerContent.includes(term)) anxiousCount++;
      });
    });
    
    // Calculate normalized scores (0-1) with improved weighting
    traits.friendliness = Math.min(friendlyCount / (userMessages.length * 0.5), 1);
    traits.formality = Math.min(formalCount / (userMessages.length * 0.3), 1);
    traits.enthusiasm = Math.min(enthusiasmCount / (userMessages.length * 0.5), 1);
    traits.curiosity = Math.min(curiosityCount / (userMessages.length * 0.5), 1);
    traits.openness = Math.min(opennessCount / (userMessages.length * 0.3), 1);
    traits.politeness = Math.min(politenessCount / (userMessages.length * 0.4), 1);
    
    // Calculate conversation style metrics
    const conversationStyle = {
      directness: Math.min(directnessCount / (userMessages.length * 0.3), 1),
      humor: Math.min(humorCount / (userMessages.length * 0.3), 1),
      emotionalExpression: Math.min((happyCount + sadCount + angryCount + anxiousCount) / (userMessages.length * 0.8), 1),
      engagement: Math.min(curiosityCount / (userMessages.length * 0.4), 1)
    };
    
    // Determine primary emotional state
    const emotionalStates = {
      happy: happyCount,
      sad: sadCount,
      angry: angryCount,
      anxious: anxiousCount
    };
    
    // Get the dominant emotional state
    let emotionalState = "neutral";
    let maxCount = 0;
    
    Object.entries(emotionalStates).forEach(([state, count]) => {
      if (count > maxCount) {
        maxCount = count;
        emotionalState = state;
      }
    });
    
    // If no clear emotional state is detected, leave as neutral
    if (maxCount < userMessages.length * 0.15) {
      emotionalState = "neutral";
    }
    
    // Normalize for at least 0.2 value on each trait
    Object.keys(traits).forEach(key => {
      if (key in traits) {
        // Type-safe trait access
        traits[key as keyof typeof traits] = Math.max(0.2, traits[key as keyof typeof traits]);
      }
    });
    
    // Get the user profile for additional personalization
    const user = await storage.getUserById(userId);
    
    // Incorporate user profile data if available
    if (user && user.bio) {
      const userBio = user.bio.toString(); // Convert to string in case it's not already
      // Extract additional interests from bio
      interestKeywords.forEach(keyword => {
        const regex = new RegExp(`${keyword}\\s+([\\w\\s]+?)(?:\\.|,|!|\\?|$|\\s\\s)`, 'gi');
        const matches = userBio.toLowerCase().match(regex);
        if (matches) {
          matches.forEach(match => {
            const interestPhrase = match.replace(new RegExp(`${keyword}\\s+`, 'i'), '').trim()
              .replace(/[.,!?]$/, ''); // Remove trailing punctuation
            if (interestPhrase.length > 2 && interestPhrase.length < 40) {
              potentialInterests.add(interestPhrase);
            }
          });
        }
      });
    }
    
    // Count questions asked and calculate response consistency
    const questionsAsked = userMessages.filter(msg => msg.content.includes('?')).length;
    
    // Calculate time consistency for message sending
    const timeConsistency = messageTimes.length >= 5 ? calculateTimeConsistency(messageTimes) : 0.5;
    
    // Determine message frequency pattern
    let messageFrequency = "moderate";
    const avgMessagesPerDay = userMessages.length / (Math.max(1, (Date.now() - new Date(messageTimes[0]).getTime()) / (24 * 60 * 60 * 1000)));
    
    if (avgMessagesPerDay < 3) {
      messageFrequency = "infrequent";
    } else if (avgMessagesPerDay > 10) {
      messageFrequency = "frequent";
    }
    
    // Create and return the comprehensive user analysis
    const completeAnalysis = {
      traits,
      interests: Array.from(potentialInterests).slice(0, 8), // Top 8 interests
      activeTimes,
      responsePatterns: {
        averageResponseTime: calculateAverageResponseTime(allMessages),
        averageMessageLength: avgMessageLength,
        topicsInitiated: Array.from(potentialTopics).slice(0, 5), // Top 5 for topics
        questionsAsked,
        responseConsistency: timeConsistency,
        messageFrequency
      },
      emotionalState,
      topics: Array.from(potentialTopics).slice(0, 5),
      contextualMemory: significantExchanges.slice(-5), // Keep last 5 significant exchanges
      conversationStyle
    };
    
    console.log(`[ProactiveMessaging] Completed personality analysis for user ${userId}`);
    return completeAnalysis;
    
  } catch (error) {
    console.error(`[ProactiveMessaging] Error analyzing user personality:`, error);
    // Return default analysis on error
    return {
      traits: {
        friendliness: 0.5,
        formality: 0.5,
        enthusiasm: 0.5,
        curiosity: 0.5,
        verbosity: 0.5,
        consistency: 0.5,
        openness: 0.5,
        politeness: 0.5
      },
      interests: [],
      activeTimes: Array(24).fill(0),
      responsePatterns: {
        averageResponseTime: 0,
        averageMessageLength: 0,
        topicsInitiated: [],
        questionsAsked: 0,
        responseConsistency: 0.5,
        messageFrequency: "moderate"
      },
      emotionalState: "neutral",
      topics: [],
      contextualMemory: [],
      conversationStyle: {
        directness: 0.5,
        humor: 0.5,
        emotionalExpression: 0.5,
        engagement: 0.5
      }
    };
  }
}

/**
 * Calculate the consistency of message timing
 */
function calculateTimeConsistency(messageTimes: Date[]): number {
  try {
    if (messageTimes.length < 3) return 0.5;
    
    // Calculate time differences between consecutive messages
    const timeDiffs: number[] = [];
    for (let i = 1; i < messageTimes.length; i++) {
      timeDiffs.push(messageTimes[i].getTime() - messageTimes[i-1].getTime());
    }
    
    // Calculate mean time difference
    const meanTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    
    // Calculate standard deviation
    const squaredDiffs = timeDiffs.map(diff => Math.pow(diff - meanTimeDiff, 2));
    const variance = squaredDiffs.reduce((sum, sqDiff) => sum + sqDiff, 0) / timeDiffs.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (lower is more consistent)
    const cv = stdDev / meanTimeDiff;
    
    // Map to 0-1 scale where 1 is very consistent
    return Math.min(1, Math.max(0, 1 - (cv / 5)));
  } catch (error) {
    console.error('[ProactiveMessaging] Error calculating time consistency:', error);
    return 0.5;
  }
}

/**
 * Calculate average response time between messages
 */
function calculateAverageResponseTime(messages: any[]): number {
  try {
    if (messages.length < 4) return 0;
    
    let totalResponseTime = 0;
    let pairCount = 0;
    
    // For each user message followed by a character message
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].isUser && !messages[i+1].isUser) {
        const userMsgTime = messages[i].timestamp instanceof Date 
          ? messages[i].timestamp 
          : new Date(messages[i].timestamp || Date.now());
          
        const responseMsgTime = messages[i+1].timestamp instanceof Date 
          ? messages[i+1].timestamp 
          : new Date(messages[i+1].timestamp || Date.now());
        
        const timeDiff = responseMsgTime.getTime() - userMsgTime.getTime();
        
        // Only include if it's a reasonable time (less than 10 minutes)
        // to exclude outliers where systems were down or user was offline
        if (timeDiff > 0 && timeDiff < 10 * 60 * 1000) {
          totalResponseTime += timeDiff;
          pairCount++;
        }
      }
    }
    
    return pairCount > 0 ? totalResponseTime / pairCount : 0;
  } catch (error) {
    console.error('[ProactiveMessaging] Error calculating average response time:', error);
    return 0;
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
  const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
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
  
  // Build enhanced personalization components
  let personalizedComponents = [];
  
  // Add greeting based on time of day and day of week
  personalizedComponents.push(`It's ${timeContext} on ${dayNames[currentDay]} where the user might be.`);
  
  // Add trait-based guidance with more nuanced descriptions
  if (userAnalysis.traits.formality > 0.7) {
    personalizedComponents.push("The user tends to be formal and proper, so maintain appropriate politeness and structure in your message.");
  } else if (userAnalysis.traits.formality < 0.4) {
    personalizedComponents.push("The user is casual and informal, so adopt a relaxed, friendly conversational style with less formal language.");
  }
  
  if (userAnalysis.traits.verbosity > 0.7) {
    personalizedComponents.push("The user enjoys detailed, thorough responses, so provide thoughtful explanations with some depth.");
  } else if (userAnalysis.traits.verbosity < 0.4) {
    personalizedComponents.push("The user prefers concise, to-the-point responses, so keep messages brief and direct.");
  }
  
  if (userAnalysis.traits.enthusiasm > 0.7) {
    personalizedComponents.push("The user is enthusiastic and expressive, so match their energy level with some enthusiasm in your message.");
  }
  
  if (userAnalysis.traits.curiosity > 0.7) {
    personalizedComponents.push("The user is very curious and inquisitive, so include thought-provoking questions that invite exploration.");
  }
  
  // Add personality insights based on conversation style
  if (userAnalysis.conversationStyle?.humor > 0.6) {
    personalizedComponents.push("The user appreciates humor and light-heartedness, so a touch of humor would be well-received.");
  }
  
  if (userAnalysis.conversationStyle?.directness > 0.6) {
    personalizedComponents.push("The user values directness and straightforwardness, so be clear and to the point.");
  }
  
  if (userAnalysis.traits.openness > 0.6) {
    personalizedComponents.push("The user is open to new ideas and perspectives, so don't hesitate to offer alternative viewpoints.");
  }
  
  if (userAnalysis.traits.politeness > 0.7) {
    personalizedComponents.push("The user is consistently polite and courteous, so respond with similar courtesy.");
  }
  
  // Add emotional state-based personalization
  if (userAnalysis.emotionalState && userAnalysis.emotionalState !== "neutral") {
    const emotionGuidance: Record<string, string> = {
      happy: "The user appears to be in a positive, upbeat mood recently. Match this positive tone appropriately.",
      sad: "The user seems to have expressed some sadness or disappointment recently. Respond with appropriate empathy and warmth.",
      angry: "The user has expressed some frustration or annoyance recently. Acknowledge their feelings respectfully.",
      anxious: "The user has expressed some concern or worry recently. Respond with reassurance and calm."
    };
    
    const emotionalState = userAnalysis.emotionalState as string;
    if (emotionalState in emotionGuidance) {
      personalizedComponents.push(emotionGuidance[emotionalState]);
    }
  }
  
  // Add interest-based personalization
  if (userAnalysis.interests.length > 0) {
    // Randomly select up to two of their interests to potentially bring up
    const selectedInterests = [];
    const interestsCopy = [...userAnalysis.interests];
    
    // Get first interest
    if (interestsCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * interestsCopy.length);
      selectedInterests.push(interestsCopy[randomIndex]);
      interestsCopy.splice(randomIndex, 1);
    }
    
    // Get second interest (if available)
    if (interestsCopy.length > 0 && Math.random() > 0.5) {
      const randomIndex = Math.floor(Math.random() * interestsCopy.length);
      selectedInterests.push(interestsCopy[randomIndex]);
    }
    
    if (selectedInterests.length === 1) {
      personalizedComponents.push(`If contextually appropriate, consider referencing the user's interest in ${selectedInterests[0]}.`);
    } else if (selectedInterests.length === 2) {
      personalizedComponents.push(`The user has shown interest in both ${selectedInterests[0]} and ${selectedInterests[1]}. You could mention one of these if it fits naturally.`);
    }
  }
  
  // Add topic-based context from previous conversations
  if (userAnalysis.topics && userAnalysis.topics.length > 0) {
    const randomTopic = userAnalysis.topics[Math.floor(Math.random() * userAnalysis.topics.length)];
    personalizedComponents.push(`The user has previously discussed the topic of ${randomTopic}, which could be relevant.`);
  }
  
  // Add contextual memory if available
  if (userAnalysis.contextualMemory && userAnalysis.contextualMemory.length > 0) {
    // Get a random memory for context
    const randomMemory = userAnalysis.contextualMemory[Math.floor(Math.random() * userAnalysis.contextualMemory.length)];
    personalizedComponents.push(`Reference this exchange from your previous conversation if relevant:\n${randomMemory}`);
  }
  
  // Consider activity patterns
  if (isActiveHour) {
    personalizedComponents.push("This is typically an active time for this user, so they're likely to respond soon.");
  }
  
  // Add response pattern guidance
  if (userAnalysis.responsePatterns?.messageFrequency) {
    const frequencyGuidance: Record<string, string> = {
      frequent: "The user tends to exchange messages frequently. They may appreciate a prompt response.",
      moderate: "The user messages at a moderate pace, maintaining steady conversations.",
      infrequent: "The user tends to message infrequently. A thoughtful message that stands on its own is appropriate."
    };
    
    const frequency = userAnalysis.responsePatterns.messageFrequency as string;
    if (frequency in frequencyGuidance) {
      personalizedComponents.push(frequencyGuidance[frequency]);
    }
  }
  
  // Build a more comprehensive prompt with all personality insights
  const enhancedPrompt = `
${basePrompt}

Incorporate these personalization insights about the user to create a natural, proactive message that feels personal and tailored:

${personalizedComponents.map(comp => `- ${comp}`).join('\n')}

Your message should:
1. Feel like a natural continuation of your relationship with this user
2. Stay true to ${character.name}'s unique personality and character traits 
3. Adapt to the user's communication style as described above
4. Be engaging enough to invite a response
5. Sound like something you'd genuinely want to share with or ask this specific user

Aim for an authentic, personalized message that the user will find meaningful and worth responding to.
  `;
  
  return enhancedPrompt;
}

/**
 * Generate and send a proactive message from a character
 */
async function sendProactiveMessage(conversation: ConversationState): Promise<void> {
  try {
    const { userId, characterId } = conversation;
    
    console.log(`[ProactiveMessaging] Attempting to send proactive message from character ${characterId} to user ${userId}`);
    
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
    
    if (!aiResponse) {
      console.error('[ProactiveMessaging] Failed to generate AI response');
      return;
    }
    
    console.log(`[ProactiveMessaging] Successfully generated AI response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
    
    // Store the message in the database
    const aiMessage = await storage.createMessage({
      userId: userId,
      characterId: characterId,
      content: aiResponse,
      isUser: false,
      language: 'english',
      script: undefined,
    });
    
    if (!aiMessage) {
      console.error('[ProactiveMessaging] Failed to store message in database');
      return;
    }
    
    // Update conversation tracking
    conversation.lastMessageTime = Date.now();
    conversation.lastProactiveMessageTime = Date.now();
    conversation.proactiveMessagesSent += 1;
    
    // Emit the message via Socket.IO
    const io = socketService.getIO();
    if (io) {
      try {
        // Find the socket for this user
        io.to(`user_${userId}`).emit('character_message', {
          message: aiMessage,
          character: {
            id: character.id,
            name: character.name,
            avatar: character.avatar
          }
        });
        
        console.log(`[ProactiveMessaging] Successfully sent proactive message from ${character.name} to user ${userId}`);
      } catch (socketError) {
        console.error(`[ProactiveMessaging] Socket emission error:`, socketError);
      }
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
  const conversationKeys = Array.from(activeConversations.keys());
  
  console.log(`[ProactiveMessaging] Scanning ${conversationKeys.length} active conversations for proactive messaging opportunities`);
  
  let proactiveMessagesSent = 0;
  
  // Process each conversation
  for (let i = 0; i < conversationKeys.length; i++) {
    const key = conversationKeys[i];
    const conversation = activeConversations.get(key);
    if (!conversation) continue;
    
    try {
      // Check if user is online (if socket service is available)
      const io = socketService.getIO();
      const isUserOnline = io ? io.sockets.adapter.rooms.has(`user_${conversation.userId}`) : false;
      
      // Skip if user has been active recently or shouldn't get a message now
      const shouldSend = await shouldSendProactiveMessage(conversation);
      if (shouldSend) {
        // If we have the socket service, prioritize online users
        if (!isUserOnline && Math.random() > 0.3) {
          // 70% chance to skip offline users (but still allow some messages to offline users)
          continue;
        }
        
        await sendProactiveMessage(conversation);
        proactiveMessagesSent++;
      }
    } catch (error) {
      console.error(`[ProactiveMessaging] Error scanning conversation ${key}:`, error);
    }
  }
  
  if (proactiveMessagesSent > 0) {
    console.log(`[ProactiveMessaging] Sent ${proactiveMessagesSent} proactive messages in this scan`);
  }
}

/**
 * Clear old conversations that have been inactive for too long
 */
function cleanupInactiveConversations(): void {
  const now = Date.now();
  const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours
  
  // Use Array.from to convert the entries iterator to an array for compatibility
  Array.from(activeConversations.entries()).forEach(([key, conversation]) => {
    const timeSinceLastMessage = now - conversation.lastMessageTime;
    
    if (timeSinceLastMessage > maxInactiveTime) {
      activeConversations.delete(key);
      console.log(`[ProactiveMessaging] Removed inactive conversation: ${key}`);
    }
  });
}

/**
 * Reset daily message counters
 */
function resetDailyCounters(): void {
  // Use Array.from to convert the values iterator to an array for compatibility
  Array.from(activeConversations.values()).forEach(conversation => {
    conversation.proactiveMessagesSent = 0;
  });
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
        const customChar = await storage.getCustomCharacterById(customId);
        if (customChar) character = customChar;
      } else {
        const predefinedChar = await storage.getPredefinedCharacterById(characterId);
        if (predefinedChar) character = predefinedChar;
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
    conversation.lastProactiveMessageTime = Date.now() - (3 * 60 * 60 * 1000); // Last proactive message 3 hours ago
    
    console.log('[ProactiveMessaging] Initiating test message');
    
    // Skip the shouldSendProactiveMessage check and directly send a message
    try {
      // First analyze the user profile to make the test message more personalized
      const user = await storage.getUserById(userId);
      
      if (user) {
        console.log(`[ProactiveMessaging] Test for user ${userId} (${user.username})`);
      }
      
      // Directly send proactive message without checking conditions
      await sendProactiveMessage(conversation);
      console.log(`[ProactiveMessaging] Test successful for character ${characterId} to user ${userId}`);
      return true;
    } catch (innerError) {
      console.error(`[ProactiveMessaging] Test message sending failed:`, innerError);
      return false;
    }
  } catch (error) {
    console.error(`[ProactiveMessaging] Test error:`, error);
    return false;
  }
}

/**
 * Get all active conversations for monitoring and debugging
 */
export function getActiveConversations(): Array<{key: string, conversation: ConversationState}> {
  return Array.from(activeConversations.entries()).map(([key, conversation]) => ({
    key,
    conversation
  }));
}

/**
 * Initialize the proactive messaging service
 */
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