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

// List of prohibited words to filter (expandable)
const prohibitedWords: Record<string, string[]> = {
  'violence': [
    'bomb', 'kill', 'murder', 'terrorist', 'shooting', 'attack', 'explosive', 'weapon',
    'violent', 'violence', 'suicide', 'torture'
  ],
  'sexual_exploitation': [
    'child pornography', 'cp', 'minor', 'underage', 'jailbait', 'pedo',
    'rape', 'assault', 'molest', 'trafficking', 'forced'
  ],
  'hate_speech': [
    'nigger', 'faggot', 'chink', 'spic', 'kike', 'retard', 'nazi', 'hitler',
    'genocide', 'holocaust', 'slavery'
  ],
  'self_harm': [
    'suicide', 'self-harm', 'cutting', 'hang myself', 'kill myself', 'end my life'
  ]
};

// Multilingual equivalents could be added for common languages
const multilingualProhibitedWords: Record<string, string[]> = {
  'es': ['bomba', 'matar', 'violar', 'terrorista', 'suicidio'], // Spanish
  'fr': ['bombe', 'tuer', 'viol', 'terroriste', 'suicide'], // French
  'de': ['bombe', 'töten', 'vergewaltigung', 'terrorist', 'selbstmord'], // German
  'ja': ['爆弾', '殺す', 'レイプ', 'テロリスト', '自殺'], // Japanese
  'zh': ['炸弹', '杀', '强奸', '恐怖分子', '自杀'] // Chinese
};

/**
 * Check if a message contains prohibited content
 * @param content The message content to check
 * @returns Object with flag status and reason if flagged
 */
export function checkMessageContent(content: string): { flagged: boolean; reason?: string } {
  // Convert to lowercase for case-insensitive matching
  const normalizedContent = content.toLowerCase();
  
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
 */
export async function flagMessage(
  messageId: number,
  senderId: number,
  receiverId: number,
  content: string,
  reason: string
): Promise<schema.FlaggedMessage> {
  // Insert the flagged message into the database
  const [flaggedMessage] = await flaggedMessagesDb
    .insert(schema.flaggedMessages)
    .values({
      messageId,
      senderId,
      receiverId,
      content,
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
  let queryBase = flaggedMessagesDb
    .select()
    .from(schema.flaggedMessages);
    
  // Apply the where condition first if needed
  if (!includeReviewed) {
    queryBase = queryBase.where(sql`${schema.flaggedMessages.reviewed} = 0`);
  }
  
  // Then apply sorting and pagination
  const flaggedMessages = await queryBase
    .orderBy(sql`${schema.flaggedMessages.timestamp} DESC`)
    .limit(limit)
    .offset(offset);
  
  // Enhance with user information
  const enhancedMessages = await Promise.all(
    flaggedMessages.map(async (message) => {
      const sender = await storage.getUser(message.senderId);
      const receiver = await storage.getUser(message.receiverId);
      
      return {
        ...message,
        senderUsername: sender?.username || "Unknown",
        receiverUsername: receiver?.username || "Unknown"
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