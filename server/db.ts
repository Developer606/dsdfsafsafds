import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('sqlite.db', {
  fileMustExist: false, // Create the file if it doesn't exist
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = ON');

// Create connection
export const db = drizzle(sqlite, { schema });

// Enhanced indexes for better query performance
function createIndexes() {
  try {
    // Create indexes in a transaction for atomicity
    sqlite.transaction(() => {
      // User indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();

      // Message indexes - Added compound index for character_id + timestamp
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_char_time ON messages(character_id, timestamp)').run();

      // Custom character indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_custom_chars_user ON custom_characters(user_id)').run();
    })();

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw, as indexes are optional for functionality
  }
}

// Create indexes on startup
createIndexes();