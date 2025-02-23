import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('database.sqlite', {
  // WAL mode for better concurrent access
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = ON');

// Create connection pool
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // Run migration
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Database migrations completed successfully');

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
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);').run();
      sqlite.prepare('CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id);').run();
    })();
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw, as indexes are optional for functionality
  }
}