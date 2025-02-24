import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

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

// Run migrations on startup
export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Database migrations completed successfully');
  } catch (error: any) {
    console.error('Database migration failed:', error);
    throw error;
  }
}