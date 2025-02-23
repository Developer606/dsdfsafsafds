import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('sqlite.db', {
  // WAL mode for better concurrent access
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = ON');

// Create connection
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // Create tables directly from schema
    const migrationQueries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        age INTEGER,
        gender TEXT,
        is_premium INTEGER NOT NULL DEFAULT 0,
        trial_characters_created INTEGER NOT NULL DEFAULT 0,
        subscription_tier TEXT,
        subscription_status TEXT DEFAULT 'trial',
        subscription_expires_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_user INTEGER NOT NULL,
        language TEXT DEFAULT 'english',
        script TEXT,
        timestamp INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS custom_characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL,
        persona TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    // Execute each creation query in a transaction
    sqlite.transaction(() => {
      for (const query of migrationQueries) {
        sqlite.prepare(query).run();
      }
    })();

    console.log('Database tables created successfully');

    // Create indexes for better performance
    createIndexes();
  } catch (error: any) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

// Create indexes for high-performance queries
function createIndexes() {
  try {
    // Create indexes in a transaction for atomicity
    sqlite.transaction(() => {
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id)').run();
    })();
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw, as indexes are optional for functionality
  }
}