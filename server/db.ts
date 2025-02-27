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

// Function to check and add missing columns
async function ensureColumns() {
  console.log('Checking for missing columns...');
  try {
    // Get existing columns for users table
    const userColumns = sqlite.prepare("PRAGMA table_info(users)").all();
    const existingColumns = new Set(userColumns.map((col: any) => col.name));

    // Add missing columns if needed
    const columnsToAdd = [
      { name: 'role', sql: 'TEXT NOT NULL DEFAULT "user"' },
      { name: 'is_admin', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'is_premium', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'is_blocked', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'is_restricted', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'is_email_verified', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'verification_token', sql: 'TEXT' },
      { name: 'verification_token_expiry', sql: 'INTEGER' },
      { name: 'trial_characters_created', sql: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'subscription_tier', sql: 'TEXT' },
      { name: 'subscription_status', sql: 'TEXT DEFAULT "trial"' },
      { name: 'subscription_expires_at', sql: 'INTEGER' },
      { name: 'last_login_at', sql: 'INTEGER' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.has(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        sqlite.prepare(`ALTER TABLE users ADD COLUMN ${column.name} ${column.sql}`).run();
      }
    }

    console.log('All required columns are now present');
  } catch (error: any) {
    console.error('Error ensuring columns:', error);
    throw error;
  }
}

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
      )`,
      `CREATE TABLE IF NOT EXISTS pending_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        verification_token TEXT NOT NULL,
        token_expiry INTEGER NOT NULL,
        registration_data TEXT,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS otp_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        timestamp INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
      )`
    ];

    // Execute each creation query in a transaction
    sqlite.transaction(() => {
      for (const query of migrationQueries) {
        sqlite.prepare(query).run();
      }
    })();

    console.log('Database tables created successfully');

    // Ensure all columns exist
    await ensureColumns();

    // Create indexes for better performance
    createIndexes();
  } catch (error: any) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

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

      // Verification indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_pending_verifications_email ON pending_verifications(email)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_pending_verifications_token ON pending_verifications(verification_token)').run();

      // Add index for OTP attempts
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_otp_attempts_email_time ON otp_attempts(email, timestamp)').run();
    })();

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw, as indexes are optional for functionality
  }
}