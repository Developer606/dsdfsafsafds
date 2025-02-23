import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('sqlite.db', {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = ON');

// Create connection
export const db = drizzle(sqlite, { schema });

// Helper function to hash password for admin
async function hashPassword(password: string) {
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
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
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_premium INTEGER NOT NULL DEFAULT 0,
        trial_characters_created INTEGER NOT NULL DEFAULT 0,
        subscription_tier TEXT,
        subscription_status TEXT DEFAULT 'trial',
        subscription_expires_at INTEGER,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        last_login_at INTEGER,
        last_activity_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        details TEXT,
        timestamp INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // Execute each creation query
    sqlite.transaction(() => {
      for (const query of migrationQueries) {
        sqlite.prepare(query).run();
      }
    })();

    console.log('Database tables created successfully');

    // Create indexes for better performance
    createIndexes();

    // Create admin user if it doesn't exist
    const adminPassword = await hashPassword('admin123');
    const checkAdmin = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!checkAdmin) {
      sqlite.prepare(`
        INSERT INTO users (username, email, password, is_admin) 
        VALUES (?, ?, ?, 1)
      `).run('admin', 'admin@example.com', adminPassword);
      console.log('Admin user created successfully');
    }

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
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(is_blocked)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_activity ON users(last_activity_at)').run();

      // Activity indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_activities_user ON user_activities(user_id)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_activities_type ON user_activities(activity_type)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_activities_time ON user_activities(timestamp)').run();

      // Message indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id)').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_char_time ON messages(character_id, timestamp)').run();

      // Custom character indexes
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_characters_user ON custom_characters(user_id)').run();
    })();

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}