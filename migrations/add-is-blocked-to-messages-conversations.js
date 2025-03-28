// Migration script to add is_blocked column to user_conversations table in messages.db

import sqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Open the SQLite database
    const db = new sqlite3(path.join(__dirname, '../messages.db'));
    
    console.log('Starting migration to add is_blocked column to user_conversations table in messages.db...');
    
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(user_conversations)").all();
    const hasIsBlocked = tableInfo.some(column => column.name === 'is_blocked');
    
    if (hasIsBlocked) {
      console.log('Column is_blocked already exists. No migration needed.');
    } else {
      // Add the column
      db.prepare("ALTER TABLE user_conversations ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0").run();
      console.log('Successfully added is_blocked column to user_conversations table in messages.db');
    }
    
    db.close();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();