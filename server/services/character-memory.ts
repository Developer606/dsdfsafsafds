/**
 * Character Memory System
 * 
 * This module provides enhanced memory capabilities for AI characters, enabling them to:
 * - Remember important details from past conversations
 * - Learn from user interactions
 * - Make independent decisions about new conversation topics
 * - Analyze user sentiment and adjust responses accordingly
 */

import { storage } from '../storage';
import { type Message, type User } from '@shared/schema';
import { socketService } from '../socket-io-server';

// Memory storage for characters
interface CharacterMemory {
  userId: number;
  characterId: string;
  importantDetails: MemoryItem[];
  learnedTopics: TopicInterest[];
  sentimentHistory: SentimentRecord[];
  lastAnalyzedMessageId?: number;
}

// Individual memory item with metadata 
interface MemoryItem {
  id: string;
  content: string;
  importance: number; // 1-10 scale
  category: MemoryCategory;
  timestamp: number;
  lastRecalled?: number;
  recallCount: number;
}

// Categories of memories
type MemoryCategory = 
  | 'personal_info' 
  | 'preferences' 
  | 'events' 
  | 'relationships'
  | 'aspirations'
  | 'fears'
  | 'beliefs';

// Topic interest tracking
interface TopicInterest {
  topic: string;
  interestLevel: number; // 1-10 scale
  lastDiscussed: number;
  discussionCount: number;
}

// Sentiment tracking
interface SentimentRecord {
  messageId: number;
  timestamp: number;
  sentiment: Sentiment;
}

interface Sentiment {
  score: number; // -1 to 1 (negative to positive)
  emotion?: string;
  intensity: number; // 0-1 scale
}

// Memory storage - will be persisted to database in production
const characterMemories = new Map<string, CharacterMemory>();

// Track active chat sessions
const activeChatSessions = new Map<string, boolean>();

/**
 * Get memory key from user and character IDs
 */
function getMemoryKey(userId: number, characterId: string): string {
  return `${userId}:${characterId}`;
}

/**
 * Initialize or retrieve a character's memory for a user
 */
export async function getCharacterMemory(userId: number, characterId: string): Promise<CharacterMemory> {
  const memoryKey = getMemoryKey(userId, characterId);
  
  if (!characterMemories.has(memoryKey)) {
    // Create new memory entry
    characterMemories.set(memoryKey, {
      userId,
      characterId,
      importantDetails: [],
      learnedTopics: [],
      sentimentHistory: [],
    });
    
    // Attempt to load existing messages for this conversation and analyze them
    await analyzeExistingConversation(userId, characterId);
  }
  
  return characterMemories.get(memoryKey)!;
}

/**
 * Mark a chat session as active when the user opens the chat page
 */
export function markChatSessionActive(userId: number, characterId: string): void {
  const sessionKey = getMemoryKey(userId, characterId);
  activeChatSessions.set(sessionKey, true);
}

/**
 * Mark a chat session as inactive when the user leaves the chat page
 */
export function markChatSessionInactive(userId: number, characterId: string): void {
  const sessionKey = getMemoryKey(userId, characterId);
  activeChatSessions.set(sessionKey, false);
}

/**
 * Check if a chat session is currently active
 */
export function isChatSessionActive(userId: number, characterId: string): boolean {
  const sessionKey = getMemoryKey(userId, characterId);
  return activeChatSessions.get(sessionKey) === true;
}

/**
 * Analyze all existing messages from a conversation to build memory
 */
async function analyzeExistingConversation(userId: number, characterId: string): Promise<void> {
  try {
    // Get all messages for this conversation
    const messages = await storage.getUserCharacterMessages(userId, characterId);
    
    if (!messages || messages.length === 0) {
      return; // No messages to analyze
    }
    
    // Get memory object
    const memory = await getCharacterMemory(userId, characterId);
    
    // Process each message to extract important details
    for (const message of messages) {
      if (message.isUser) {
        await analyzeUserMessage(message, memory);
      }
    }
    
    // Set the last analyzed message ID to avoid reprocessing
    const lastMessage = messages[messages.length - 1];
    memory.lastAnalyzedMessageId = lastMessage.id;
    
  } catch (error) {
    console.error('[CharacterMemory] Error analyzing existing conversation:', error);
  }
}

/**
 * Extract important details and sentiment from a user message
 */
async function analyzeUserMessage(message: Message, memory: CharacterMemory): Promise<void> {
  // Skip if we've already analyzed this message
  if (memory.lastAnalyzedMessageId && message.id <= memory.lastAnalyzedMessageId) {
    return;
  }
  
  try {
    // Extract personal information mentions (simple pattern matching for demo)
    extractPersonalInfo(message.content, memory);
    
    // Extract preferences
    extractPreferences(message.content, memory);
    
    // Extract sentiment
    const sentiment = analyzeSentiment(message.content);
    memory.sentimentHistory.push({
      messageId: message.id,
      timestamp: message.timestamp.getTime(),
      sentiment
    });
    
    // Extract topics of interest
    extractTopics(message.content, memory);
    
  } catch (error) {
    console.error('[CharacterMemory] Error analyzing message:', error);
  }
}

/**
 * Extract personal information from message text
 */
function extractPersonalInfo(text: string, memory: CharacterMemory): void {
  const patterns = [
    { regex: /my name is ([A-Za-z\s]+)/i, category: 'personal_info' as MemoryCategory, importance: 9 },
    { regex: /I am (\d+) years old/i, category: 'personal_info' as MemoryCategory, importance: 8 },
    { regex: /I work(?:ed)? (?:as|at) ([^,.]+)/i, category: 'personal_info' as MemoryCategory, importance: 7 },
    { regex: /I live in ([^,.]+)/i, category: 'personal_info' as MemoryCategory, importance: 7 },
    { regex: /my birthday is ([^,.]+)/i, category: 'personal_info' as MemoryCategory, importance: 6 },
    { regex: /I have (?:a|an) ([^,.]+) pet/i, category: 'personal_info' as MemoryCategory, importance: 5 },
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match && match[1]) {
      addMemoryItem(memory, {
        id: `personal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: match[0],
        importance: pattern.importance,
        category: pattern.category,
        timestamp: Date.now(),
        recallCount: 0
      });
    }
  }
}

/**
 * Extract user preferences from message text
 */
function extractPreferences(text: string, memory: CharacterMemory): void {
  const patterns = [
    { regex: /I (?:really )?like ([^,.]+)/i, category: 'preferences' as MemoryCategory, importance: 6 },
    { regex: /I love ([^,.]+)/i, category: 'preferences' as MemoryCategory, importance: 7 },
    { regex: /I hate ([^,.]+)/i, category: 'preferences' as MemoryCategory, importance: 7 },
    { regex: /I don'?t like ([^,.]+)/i, category: 'preferences' as MemoryCategory, importance: 6 },
    { regex: /my favorite ([^,.]+) is ([^,.]+)/i, category: 'preferences' as MemoryCategory, importance: 8 },
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern.regex);
    for (const match of Array.from(matches)) {
      if (match && match[1]) {
        addMemoryItem(memory, {
          id: `preference_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          content: match[0],
          importance: pattern.importance,
          category: pattern.category,
          timestamp: Date.now(),
          recallCount: 0
        });
      }
    }
  }
}

/**
 * Extract topics of interest from message text
 */
function extractTopics(text: string, memory: CharacterMemory): void {
  // List of potential topics to track
  const potentialTopics = [
    'music', 'movies', 'books', 'travel', 'food', 'sports', 'gaming',
    'technology', 'art', 'science', 'politics', 'pets', 'fashion',
    'health', 'fitness', 'education', 'history', 'philosophy', 'religion',
    'relationships', 'career', 'hobbies', 'family', 'friends'
  ];
  
  const lowercaseText = text.toLowerCase();
  
  for (const topic of potentialTopics) {
    if (lowercaseText.includes(topic)) {
      // Check if this topic already exists
      const existingTopic = memory.learnedTopics.find(t => t.topic === topic);
      
      if (existingTopic) {
        // Update existing topic
        existingTopic.interestLevel = Math.min(10, existingTopic.interestLevel + 1);
        existingTopic.lastDiscussed = Date.now();
        existingTopic.discussionCount += 1;
      } else {
        // Add new topic
        memory.learnedTopics.push({
          topic,
          interestLevel: 5, // Initial interest level
          lastDiscussed: Date.now(),
          discussionCount: 1
        });
      }
    }
  }
}

/**
 * Perform basic sentiment analysis on message text
 */
function analyzeSentiment(text: string): Sentiment {
  // This is a simplified sentiment analysis for demonstration purposes
  // In a production environment, you'd use a more sophisticated NLP solution
  
  const positiveWords = [
    'happy', 'great', 'excellent', 'good', 'wonderful', 'amazing', 'love',
    'enjoy', 'fantastic', 'awesome', 'beautiful', 'excited', 'glad', 'thanks'
  ];
  
  const negativeWords = [
    'sad', 'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
    'annoyed', 'angry', 'upset', 'disappointed', 'frustrated', 'sorry'
  ];
  
  // Basic emotion detection
  const emotions = {
    joy: ['happy', 'excited', 'delighted', 'glad', 'pleased'],
    sadness: ['sad', 'upset', 'depressed', 'unhappy', 'miserable'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated'],
    fear: ['scared', 'afraid', 'terrified', 'worried', 'anxious'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
    disgust: ['disgusted', 'repulsed', 'revolted'],
    trust: ['trust', 'believe', 'faith', 'confident'],
    anticipation: ['excited', 'looking forward', 'can\'t wait']
  };
  
  const words = text.toLowerCase().split(/\W+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  const emotionCounts: Record<string, number> = {};
  
  // Count positive and negative words
  for (const word of words) {
    if (positiveWords.includes(word)) {
      positiveCount++;
    }
    if (negativeWords.includes(word)) {
      negativeCount++;
    }
    
    // Count emotions
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.includes(word)) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    }
  }
  
  // Calculate sentiment score (-1 to 1)
  const totalWords = words.length;
  const sentimentScore = totalWords > 0 
    ? (positiveCount - negativeCount) / Math.min(totalWords, 10)
    : 0;
  
  // Determine dominant emotion
  let dominantEmotion: string | undefined = undefined;
  let maxEmotionCount = 0;
  
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    if (count > maxEmotionCount) {
      maxEmotionCount = count;
      dominantEmotion = emotion;
    }
  }
  
  // Calculate intensity
  const intensity = Math.min(1, Math.abs(sentimentScore) * 2);
  
  return {
    score: Math.max(-1, Math.min(1, sentimentScore)), // Clamp between -1 and 1
    emotion: dominantEmotion,
    intensity
  };
}

/**
 * Add a memory item, ensuring no duplicates
 */
function addMemoryItem(memory: CharacterMemory, item: MemoryItem): void {
  // Check for similar existing items to avoid duplicates
  const similarItems = memory.importantDetails.filter(existing => 
    existing.category === item.category && 
    isSimilarText(existing.content, item.content)
  );
  
  if (similarItems.length === 0) {
    // No similar items found, add new memory
    memory.importantDetails.push(item);
  } else {
    // Update the most important similar item
    const mostImportantItem = similarItems.reduce((prev, current) => 
      prev.importance > current.importance ? prev : current
    );
    
    // Update with the higher importance
    mostImportantItem.importance = Math.max(mostImportantItem.importance, item.importance);
    mostImportantItem.timestamp = Date.now();
  }
}

/**
 * Check if two text strings are similar
 */
function isSimilarText(text1: string, text2: string): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '');
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  // If one is a substring of the other, consider them similar
  if (normalizedText1.includes(normalizedText2) || normalizedText2.includes(normalizedText1)) {
    return true;
  }
  
  // Simple word-based similarity measure
  const words1Set = normalizedText1.split(/\s+/);
  const words2Set = normalizedText2.split(/\s+/);
  
  // Count common words
  let commonCount = 0;
  for (const word of words1Set) {
    if (words2Set.includes(word)) {
      commonCount++;
    }
  }
  
  // Calculate Jaccard similarity
  const uniqueWords1 = new Set(words1Set);
  const uniqueWords2 = new Set(words2Set);
  const unionSize = uniqueWords1.size + uniqueWords2.size - commonCount;
  const similarity = unionSize > 0 ? commonCount / unionSize : 0;
  
  // Consider similar if similarity is above threshold
  return similarity > 0.3;
}

/**
 * Generate a memory-enhanced prompt that includes relevant memory elements
 */
export function generateMemoryEnhancedPrompt(
  basePrompt: string,
  memory: CharacterMemory,
  recentMessages: Message[],
  maxMemoryItems: number = 5
): string {
  // Start with the base prompt
  let enhancedPrompt = basePrompt;
  
  // Calculate recency and importance weights for memory items
  const now = Date.now();
  const weightedItems = memory.importantDetails.map(item => {
    // 1-month half-life for memories
    const ageInDays = (now - item.timestamp) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-0.023 * ageInDays); // Exponential decay
    
    // Weight by importance and recency
    const totalWeight = item.importance * recencyWeight;
    
    return {
      ...item,
      weight: totalWeight
    };
  });
  
  // Sort by weight and take top items
  const topMemories = weightedItems
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxMemoryItems);
  
  // Add memories to the prompt
  if (topMemories.length > 0) {
    enhancedPrompt += "\n\nImportant things to remember about the user:\n";
    
    topMemories.forEach(item => {
      enhancedPrompt += `- ${item.content}\n`;
      
      // Update recall count and timestamp
      const original = memory.importantDetails.find(m => m.id === item.id);
      if (original) {
        original.recallCount += 1;
        original.lastRecalled = now;
      }
    });
  }
  
  // Add user's interests
  const topInterests = memory.learnedTopics
    .sort((a, b) => b.interestLevel - a.interestLevel)
    .slice(0, 3);
  
  if (topInterests.length > 0) {
    enhancedPrompt += "\n\nThe user is interested in these topics:\n";
    topInterests.forEach(topic => {
      enhancedPrompt += `- ${topic.topic}\n`;
    });
  }
  
  // Add recent sentiment analysis
  const recentSentiments = memory.sentimentHistory
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  
  if (recentSentiments.length > 0) {
    const averageSentiment = recentSentiments.reduce((sum, item) => sum + item.sentiment.score, 0) / recentSentiments.length;
    const sentimentDescription = averageSentiment > 0.3 ? "positive" : (averageSentiment < -0.3 ? "negative" : "neutral");
    
    enhancedPrompt += `\nThe user's recent messages have had a ${sentimentDescription} tone. `;
    
    // Add dominant emotion if available
    const recentEmotions = recentSentiments
      .filter(item => item.sentiment.emotion)
      .map(item => item.sentiment.emotion);
      
    if (recentEmotions.length > 0) {
      // Count emotion frequencies
      const emotionCounts: Record<string, number> = {};
      recentEmotions.forEach(emotion => {
        if (emotion) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      });
      
      // Find most common emotion
      let dominantEmotion = '';
      let maxCount = 0;
      
      Object.entries(emotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          dominantEmotion = emotion;
          maxCount = count;
        }
      });
      
      if (dominantEmotion) {
        enhancedPrompt += `They seem to be expressing ${dominantEmotion}.`;
      }
    }
  }
  
  return enhancedPrompt;
}

/**
 * Suggest a topic based on user's interests and conversation history
 */
export function suggestConversationTopic(memory: CharacterMemory): string | null {
  if (memory.learnedTopics.length === 0) {
    return null;
  }
  
  // Weight topics by interest level and recency
  const now = Date.now();
  const weightedTopics = memory.learnedTopics.map(topic => {
    // Calculate days since last discussion
    const daysSinceDiscussed = (now - topic.lastDiscussed) / (1000 * 60 * 60 * 24);
    
    // Topics not discussed recently get a boost
    const recencyBoost = Math.min(5, daysSinceDiscussed / 2);
    
    // Weight combines interest level and recency
    const weight = topic.interestLevel + recencyBoost;
    
    return {
      ...topic,
      weight
    };
  });
  
  // Add some randomness to avoid always picking the same topics
  const randomFactor = 2;
  weightedTopics.forEach(topic => {
    topic.weight += Math.random() * randomFactor;
  });
  
  // Sort by weight
  weightedTopics.sort((a, b) => b.weight - a.weight);
  
  // Return the highest weighted topic
  return weightedTopics[0]?.topic || null;
}

/**
 * Process a new user message and update memory
 */
export async function processNewMessage(message: Message): Promise<void> {
  const { userId, characterId } = message;
  
  if (!userId || !characterId) {
    return;
  }
  
  try {
    const memory = await getCharacterMemory(userId, characterId);
    
    if (message.isUser) {
      await analyzeUserMessage(message, memory);
    }
    
  } catch (error) {
    console.error('[CharacterMemory] Error processing new message:', error);
  }
}

/**
 * Get active user sessions information
 */
export function getActiveUserSessions(characterId?: string): Record<string, boolean> {
  const activeSessions: Record<string, boolean> = {};
  
  // Convert to array to work around iteration issues
  const entries = Array.from(activeChatSessions.entries());
  for (const [key, isActive] of entries) {
    // If characterId is provided, filter only for that character
    if (characterId) {
      const [userId, charId] = key.split(':');
      if (charId === characterId) {
        activeSessions[userId] = isActive;
      }
    } else {
      activeSessions[key] = isActive;
    }
  }
  
  return activeSessions;
}

/**
 * Check if a user has an active socket connection
 */
export function isUserOnline(userId: number): boolean {
  try {
    const io = socketService.getIO();
    return io ? io.sockets.adapter.rooms.has(`user_${userId}`) : false;
  } catch (error) {
    console.error('[CharacterMemory] Error checking if user is online:', error);
    return false;
  }
}

/**
 * Analyze all messages and rebuild memory (useful for maintenance)
 */
export async function rebuildMemory(userId: number, characterId: string): Promise<void> {
  const memoryKey = getMemoryKey(userId, characterId);
  
  // Clear existing memory
  characterMemories.delete(memoryKey);
  
  // Rebuild from scratch
  await getCharacterMemory(userId, characterId);
}