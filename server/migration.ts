import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

async function runMigration() {
  console.log('Starting database migration...');

  try {
    // Open SQLite database with WAL mode
    const sqlite = new Database('sqlite.db', {
      fileMustExist: false // Create if not exists
    });

    // Enable WAL mode and other optimizations
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite, { schema });

    // Create tables if they don't exist
    console.log('Creating tables if they don\'t exist...');

    // Prepare table creation queries
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_premium INTEGER NOT NULL DEFAULT 0,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        is_restricted INTEGER NOT NULL DEFAULT 0,
        is_email_verified INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT,
        verification_token_expiry INTEGER,
        trial_characters_created INTEGER NOT NULL DEFAULT 0,
        subscription_tier TEXT,
        subscription_status TEXT DEFAULT 'trial',
        subscription_expires_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at INTEGER
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

    // Execute table creation in a transaction
    sqlite.transaction(() => {
      for (const query of tables) {
        sqlite.prepare(query).run();
      }
    })();

    // Create indexes for better performance
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_custom_chars_user ON custom_characters(user_id)'
    ];

    // Create indexes in a transaction
    sqlite.transaction(() => {
      for (const query of indexes) {
        sqlite.prepare(query).run();
      }
    })();

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export { runMigration };