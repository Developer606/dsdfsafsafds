import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql, eq } from "drizzle-orm";
import Database from "better-sqlite3";
import * as schema from "../shared/schema";
import { storage } from "./storage";

// Initialize SQLite database for flagged messages
const sqlite = new Database("flagged-messages.db");
export const flaggedMessagesDb = drizzle(sqlite);

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
): Promise<any> {
  // Insert the flagged message into the database
  await flaggedMessagesDb.run(sql`
    INSERT INTO flagged_messages 
    (message_id, sender_id, receiver_id, content, reason, reviewed, timestamp)
    VALUES 
    (${messageId}, ${senderId}, ${receiverId}, ${content}, ${reason}, 0, ${Date.now()})
  `);
  
  console.log(`Message ${messageId} flagged: ${reason}`);
  
  // Return the inserted flagged message
  const results = await flaggedMessagesDb.all(sql`
    SELECT * FROM flagged_messages 
    WHERE message_id = ${messageId}
    ORDER BY id DESC
    LIMIT 1
  `);
  const flaggedMessage = results[0];
  
  return flaggedMessage;
}

/**
 * Get all flagged messages with user details for admin review
 */
export async function getFlaggedMessages(limit = 100, offset = 0, includeReviewed = false): Promise<any[]> {
  // Query to get flagged messages
  const whereClause = !includeReviewed ? sql`WHERE reviewed = 0` : sql``;
  
  const flaggedMessages = await flaggedMessagesDb.all(sql`
    SELECT * FROM flagged_messages
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  
  // Enhance with user information
  const enhancedMessages = await Promise.all(
    flaggedMessages.map(async (message: any) => {
      const sender = await storage.getUser(message.sender_id);
      const receiver = await storage.getUser(message.receiver_id);
      
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
  await flaggedMessagesDb.run(sql`
    UPDATE flagged_messages 
    SET reviewed = ${reviewed ? 1 : 0} 
    WHERE id = ${id}
  `);
}

/**
 * Get statistics about flagged messages
 */
export async function getFlaggedMessageStats(): Promise<{
  total: number;
  unreviewed: number;
  byReason: Record<string, number>;
}> {
  // Get total count
  const totalResults = await flaggedMessagesDb.all(sql`
    SELECT COUNT(*) as count FROM flagged_messages
  `);
  const total = totalResults[0] ? Number((totalResults[0] as any).count) : 0;
  
  // Get unreviewed count
  const unreviewedResults = await flaggedMessagesDb.all(sql`
    SELECT COUNT(*) as count FROM flagged_messages WHERE reviewed = 0
  `);
  const unreviewed = unreviewedResults[0] ? Number((unreviewedResults[0] as any).count) : 0;
  
  // Group by reason
  const reasonsResult = await flaggedMessagesDb.all(sql`
    SELECT reason, COUNT(*) as count FROM flagged_messages GROUP BY reason
  `);
  
  // Process reasons
  const byReason: Record<string, number> = {};
  (reasonsResult as any[]).forEach(r => {
    const category = r.reason.split(':')[0].trim();
    byReason[category] = (byReason[category] || 0) + Number(r.count);
  });
  
  return { total, unreviewed, byReason };
}