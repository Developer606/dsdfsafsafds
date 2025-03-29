import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { userMessages, userConversations } from "../shared/schema";
import { sql } from "drizzle-orm";

// Initialize a separate SQLite database for messages
const sqliteMessages = new Database("messages.db");
export const messagesDb = drizzle(sqliteMessages);

// Initialize the messages database
export async function initializeMessagesDb() {
  console.log("Initializing messages database...");

  // Create the tables if they don't exist
  messagesDb.run(sql`
    CREATE TABLE IF NOT EXISTS user_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_data TEXT,
      video_data TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  messagesDb.run(sql`
    CREATE TABLE IF NOT EXISTS user_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      last_message_id INTEGER,
      last_message_timestamp INTEGER,
      unread_count_user1 INTEGER NOT NULL DEFAULT 0,
      unread_count_user2 INTEGER NOT NULL DEFAULT 0,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  console.log("Messages database tables created successfully");
  return messagesDb;
}