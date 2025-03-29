const { createClient } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, and } = require('drizzle-orm');
const { createPool } = require('pg');
const sqlite = require('better-sqlite3');

async function main() {
  console.log('Running create-encryption-tables migration...');
  
  try {
    // Use SQLite for local development/testing
    const sqliteDb = sqlite('sqlite.db');
    
    // Create encryption_keys table
    console.log('Creating encryption_keys table...');
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        public_key TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_user_id ON encryption_keys(user_id);
    `);
    
    // Create conversation_keys table
    console.log('Creating conversation_keys table...');
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS conversation_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        encrypted_key1 TEXT NOT NULL,
        encrypted_key2 TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversation_keys_users ON conversation_keys(user1_id, user2_id);
    `);
    
    console.log('Encryption tables created successfully');
  } catch (error) {
    console.error('Error creating encryption tables:', error);
    process.exit(1);
  }
}

main();