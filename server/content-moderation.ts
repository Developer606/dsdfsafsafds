import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import path from "path";
import { db } from "./db";
import * as schema from "../shared/schema"; 
import { storage } from "./storage";

// Initialize SQLite database for flagged messages
const sqlite = new Database("flagged-messages.db");
export const flaggedMessagesDb = drizzle(sqlite, { schema });

// Initialize flagged messages table
export async function initializeFlaggedMessagesDb() {
  console.log("Initializing flagged messages database...");
  
  // Create table if it doesn't exist
  await flaggedMessagesDb.run(sql`
    CREATE TABLE IF NOT EXISTS flagged_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      reason TEXT NOT NULL,
      reviewed BOOLEAN NOT NULL DEFAULT 0,
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  console.log("Flagged messages database initialized successfully");
}

// Default list of prohibited words to filter
const defaultProhibitedWords: Record<string, string[]> = {
  'violence': [
    'bomb', 'kill', 'murder', 'terrorist', 'shooting', 'attack', 'explosive', 'weapon',
    'violent', 'violence', 'suicide', 'torture', 'assassinate', 'massacre', 'slaughter',
    'detonate', 'hostage', 'bloodshed', 'stab', 'strangle', 'assault', 'terror attack'
  ],
  'sexual_exploitation': [
    'child pornography', 'cp', 'minor', 'underage', 'jailbait', 'pedo', 'pedophile',
    'rape', 'assault', 'molest', 'trafficking', 'forced', 'nonconsensual', 'revenge porn',
    'child abuse', 'sexual abuse', 'grooming', 'explicit', 'bestiality', 'zoophilia'
  ],
  'hate_speech': [
    'nigger', 'faggot', 'chink', 'spic', 'kike', 'retard', 'nazi', 'hitler',
    'genocide', 'holocaust', 'slavery', 'white power', 'white supremacy', 'lynching',
    'kkk', 'jew hater', 'antisemite', 'antisemitic', 'racial slur', 'racial purity'
  ],
  'self_harm': [
    'suicide', 'self-harm', 'cutting', 'hang myself', 'kill myself', 'end my life',
    'overdose', 'self-mutilation', 'slit wrists', 'jump off', 'death wish', 'suicidal'
  ],
  'drugs_illegal': [
    'cocaine', 'heroin', 'meth', 'crystal meth', 'methamphetamine', 'drug dealer',
    'drug trafficking', 'fentanyl', 'illegal drugs', 'drug smuggling', 'drug cartel'
  ],
  'threats': [
    'death threat', 'threaten', 'hunting you', 'coming for you', 'find your address',
    'find your family', 'hack you', 'doxx', 'swat', 'swatting', 'stalk', 'stalking'
  ]
};

// Custom words added by admins
let customProhibitedWords: Record<string, string[]> = {
  'violence': [],
  'sexual_exploitation': [],
  'hate_speech': [],
  'self_harm': [],
  'drugs_illegal': [],
  'threats': [],
  'custom': [] // For custom categories
};

// Combined prohibited words (default + custom)
let prohibitedWords: Record<string, string[]> = { ...defaultProhibitedWords };

// Initialize and merge prohibited words
function initializeProhibitedWords() {
  // Combine default and custom words
  prohibitedWords = { ...defaultProhibitedWords };
  
  // Add all custom words to their respective categories
  for (const category in customProhibitedWords) {
    if (category === 'custom') {
      // Add custom category if it has words
      if (customProhibitedWords.custom.length > 0) {
        prohibitedWords.custom = [...customProhibitedWords.custom];
      }
    } else if (prohibitedWords[category]) {
      // Add custom words to existing categories
      prohibitedWords[category] = [
        ...prohibitedWords[category],
        ...customProhibitedWords[category]
      ];
    }
  }
}

// Initialize words
initializeProhibitedWords();

// Multilingual equivalents for common languages
const multilingualProhibitedWords: Record<string, string[]> = {
  'es': ['bomba', 'matar', 'violar', 'terrorista', 'suicidio', 'pornografía infantil', 'drogas', 'amenaza', 'odio racial'], // Spanish
  'fr': ['bombe', 'tuer', 'viol', 'terroriste', 'suicide', 'pédophilie', 'pornographie enfantine', 'drogues', 'menace', 'haine raciale'], // French
  'de': ['bombe', 'töten', 'vergewaltigung', 'terrorist', 'selbstmord', 'kinderpornographie', 'drogen', 'drohung', 'rassenhass'], // German
  'ja': ['爆弾', '殺す', 'レイプ', 'テロリスト', '自殺', '児童ポルノ', '薬物', '脅迫', '人種差別'], // Japanese
  'zh': ['炸弹', '杀', '强奸', '恐怖分子', '自杀', '儿童色情', '毒品', '威胁', '种族仇恨'], // Chinese
  'ko': ['폭탄', '살인', '강간', '테러리스트', '자살', '아동 포르노', '마약', '협박', '인종 혐오'], // Korean
  'hi': ['बम', 'हत्या', 'बलात्कार', 'आतंकवादी', 'आत्महत्या', 'बाल अश्लीलता', 'ड्रग्स', 'धमकी', 'नस्लीय घृणा'], // Hindi
  'ar': ['قنبلة', 'قتل', 'اغتصاب', 'إرهابي', 'انتحار', 'إباحية الأطفال', 'مخدرات', 'تهديد', 'كراهية عرقية'], // Arabic
  'pt': ['bomba', 'matar', 'estupro', 'terrorista', 'suicídio', 'pornografia infantil', 'drogas', 'ameaça', 'ódio racial'] // Portuguese
};

/**
 * Check if a message contains prohibited content
 * @param content The message content to check
 * @returns Object with flag status and reason if flagged
 */
export function checkMessageContent(content: string): { flagged: boolean; reason?: string } {
  // Attempt to detect if content might be in JSON format (for media messages)
  let textToCheck = content;
  try {
    // Try to parse as JSON to handle messages with media
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      // If it contains text field, use that for checking
      if (parsed.text && typeof parsed.text === 'string') {
        textToCheck = parsed.text;
      }
    }
  } catch (e) {
    // Not JSON or invalid JSON, continue with original content
  }
  
  // Convert to lowercase for case-insensitive matching
  const normalizedContent = textToCheck.toLowerCase();
  
  // Check against all categories of prohibited words
  for (const [category, wordList] of Object.entries(prohibitedWords)) {
    for (const word of wordList) {
      // Check if the word is a whole word or part of a word
      const regex = new RegExp(`\\b${word}\\b|\\b${word}s\\b|\\b${word}ing\\b`, 'i');
      if (regex.test(normalizedContent)) {
        return { 
          flagged: true, 
          reason: `Prohibited content (${category}): "${word}"` 
        };
      }
    }
  }
  
  // Check for multilingual prohibited words
  for (const [language, wordList] of Object.entries(multilingualProhibitedWords)) {
    for (const word of wordList) {
      if (normalizedContent.includes(word)) {
        return { 
          flagged: true, 
          reason: `Prohibited content (${language}): "${word}"` 
        };
      }
    }
  }
  
  return { flagged: false };
}

/**
 * Flag a message as inappropriate
 * @param messageId The ID of the message to flag
 * @param senderId The user ID of the sender
 * @param receiverId The user ID of the receiver
 * @param content The message content (this should be the decrypted content for moderation purposes)
 * @param reason The reason for flagging
 * @param originalContent Optional original encrypted content
 * @returns The flagged message record
 */
export async function flagMessage(
  messageId: number,
  senderId: number,
  receiverId: number,
  content: string,
  reason: string,
  originalContent?: string
): Promise<schema.FlaggedMessage> {
  // Log the flagging action
  console.log(`Flagging message ${messageId} from user ${senderId}: ${reason}`);
  
  // Content to store in the database - we want to store the decrypted version for admin review
  const contentToStore = content;
  
  // Insert the flagged message into the database
  const [flaggedMessage] = await flaggedMessagesDb
    .insert(schema.flaggedMessages)
    .values({
      messageId,
      senderId,
      receiverId,
      content: contentToStore,
      reason,
      reviewed: false,
      timestamp: new Date()
    })
    .returning();
  
  console.log(`Message ${messageId} flagged: ${reason}`);
  
  return flaggedMessage;
}

/**
 * Get all flagged messages with user details for admin review
 */
export async function getFlaggedMessages(limit = 100, offset = 0, includeReviewed = false): Promise<any[]> {
  // Import decryption utility
  const { decryptMessage, isEncryptedMessage } = await import("./crypto-utils");
  
  // Create the select query
  const query = includeReviewed
    ? flaggedMessagesDb
        .select()
        .from(schema.flaggedMessages)
    : flaggedMessagesDb
        .select()
        .from(schema.flaggedMessages)
        .where(sql`${schema.flaggedMessages.reviewed} = 0`);
  
  // Then apply sorting and pagination
  const flaggedMessages = await query
    .orderBy(sql`${schema.flaggedMessages.timestamp} DESC`)
    .limit(limit)
    .offset(offset);
  
  // Enhance with user information and handle encryption
  const enhancedMessages = await Promise.all(
    flaggedMessages.map(async (message: schema.FlaggedMessage) => {
      const sender = await storage.getUser(message.senderId);
      const receiver = await storage.getUser(message.receiverId);
      
      // Check if the content is encrypted and attempt to decrypt it
      let displayContent = message.content;
      let isEncrypted = false;
      
      if (isEncryptedMessage(message.content)) {
        isEncrypted = true;
        try {
          displayContent = decryptMessage(message.content);
        } catch (err) {
          console.error(`[Admin] Error decrypting flagged message ${message.id}:`, err);
          // Keep original content if decryption fails
        }
      }
      
      return {
        ...message,
        senderUsername: sender?.username || "Unknown",
        receiverUsername: receiver?.username || "Unknown",
        originalContent: message.content,
        content: displayContent,
        isEncrypted
      };
    })
  );
  
  return enhancedMessages;
}

/**
 * Mark a flagged message as reviewed
 */
export async function markFlaggedMessageAsReviewed(id: number, reviewed = true): Promise<void> {
  await flaggedMessagesDb
    .update(schema.flaggedMessages)
    .set({ reviewed })
    .where(sql`${schema.flaggedMessages.id} = ${id}`);
}

/**
 * Get statistics about flagged messages
 */
export async function getFlaggedMessageStats(): Promise<{
  total: number;
  unreviewed: number;
  byReason: Record<string, number>;
}> {
  const total = await flaggedMessagesDb
    .select({ count: sql`count(*)` })
    .from(schema.flaggedMessages)
    .then(res => Number(res[0]?.count || 0));
  
  const unreviewed = await flaggedMessagesDb
    .select({ count: sql`count(*)` })
    .from(schema.flaggedMessages)
    .where(sql`${schema.flaggedMessages.reviewed} = 0`)
    .then(res => Number(res[0]?.count || 0));
  
  // Group by reason
  const reasons = await flaggedMessagesDb
    .select({
      reason: schema.flaggedMessages.reason,
      count: sql`count(*)`
    })
    .from(schema.flaggedMessages)
    .groupBy(schema.flaggedMessages.reason);
  
  const byReason: Record<string, number> = {};
  reasons.forEach(r => {
    const category = r.reason.split(':')[0].trim();
    byReason[category] = (byReason[category] || 0) + Number(r.count);
  });
  
  return { total, unreviewed, byReason };
}

/**
 * Get all prohibited words by category
 * @returns Object with categories and their prohibited words
 */
export function getProhibitedWords(): {
  defaultWords: Record<string, string[]>;
  customWords: Record<string, string[]>;
} {
  return {
    defaultWords: defaultProhibitedWords,
    customWords: customProhibitedWords
  };
}

/**
 * Add a new prohibited word to a category
 * @param category The category to add the word to (violence, sexual_exploitation, etc.)
 * @param word The word or phrase to add
 * @returns Success status
 */
export function addProhibitedWord(category: string, word: string): { success: boolean; error?: string } {
  // Validate word
  if (!word || word.trim() === '') {
    return { success: false, error: 'Word cannot be empty' };
  }
  
  // Normalize word
  word = word.toLowerCase().trim();
  
  // Check if category exists
  if (!customProhibitedWords[category] && category !== 'custom') {
    // If category doesn't exist, but it's in default words, add it to custom words
    if (defaultProhibitedWords[category]) {
      customProhibitedWords[category] = [];
    } else {
      return { success: false, error: 'Invalid category' };
    }
  }
  
  // If it's a custom category, ensure it exists
  if (category === 'custom' && !customProhibitedWords.custom) {
    customProhibitedWords.custom = [];
  }
  
  // Check if word already exists in category (either default or custom)
  if (
    (defaultProhibitedWords[category] && defaultProhibitedWords[category].includes(word)) ||
    (customProhibitedWords[category] && customProhibitedWords[category].includes(word))
  ) {
    return { success: false, error: 'Word already exists in this category' };
  }
  
  // Add word to custom list
  customProhibitedWords[category].push(word);
  
  // Reinitialize prohibited words
  initializeProhibitedWords();
  
  return { success: true };
}

/**
 * Remove a prohibited word from a category
 * @param category The category to remove the word from
 * @param word The word to remove
 * @returns Success status
 */
export function removeProhibitedWord(category: string, word: string): { success: boolean; error?: string } {
  // Validate inputs
  if (!category || !word) {
    return { success: false, error: 'Invalid parameters' };
  }
  
  // Normalize word
  word = word.toLowerCase().trim();
  
  // Check if category exists in custom words
  if (!customProhibitedWords[category]) {
    return { success: false, error: 'Category not found in custom words' };
  }
  
  // Check if word exists in category
  const index = customProhibitedWords[category].indexOf(word);
  if (index === -1) {
    return { success: false, error: 'Word not found in this category' };
  }
  
  // Remove word
  customProhibitedWords[category].splice(index, 1);
  
  // Reinitialize prohibited words
  initializeProhibitedWords();
  
  return { success: true };
}

/**
 * Add a new category for prohibited words
 * @param category The name of the new category
 * @returns Success status
 */
export function addProhibitedCategory(category: string): { success: boolean; error?: string } {
  // Validate category name
  if (!category || category.trim() === '') {
    return { success: false, error: 'Category name cannot be empty' };
  }
  
  // Normalize category name
  category = category.toLowerCase().trim();
  
  // Check if category already exists
  if (customProhibitedWords[category] || defaultProhibitedWords[category]) {
    return { success: false, error: 'Category already exists' };
  }
  
  // Add new category
  customProhibitedWords[category] = [];
  
  // Reinitialize prohibited words
  initializeProhibitedWords();
  
  return { success: true };
}