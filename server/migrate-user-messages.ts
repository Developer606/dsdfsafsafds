import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { userMessages, userConversations } from "../shared/schema";

// Initialize the SQLite database
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

async function migrateUserMessagingTables() {
  console.log("Creating user messaging tables...");

  // Create user_messages table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS user_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id)
    )
  `);
  
  console.log("Created user_messages table");

  // Create user_conversations table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS user_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_message_id INTEGER REFERENCES user_messages(id),
      last_message_timestamp INTEGER,
      unread_count_user1 INTEGER NOT NULL DEFAULT 0,
      unread_count_user2 INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (user1_id) REFERENCES users (id),
      FOREIGN KEY (user2_id) REFERENCES users (id),
      FOREIGN KEY (last_message_id) REFERENCES user_messages (id)
    )
  `);
  
  console.log("Created user_conversations table");
  
  console.log("Migration complete!");
}

migrateUserMessagingTables()
  .then(() => {
    console.log("Database migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database migration failed:", error);
    process.exit(1);
  });