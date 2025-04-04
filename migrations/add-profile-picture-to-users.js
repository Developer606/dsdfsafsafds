// Migration script to add profile_picture column to users table

import sqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Open the SQLite database
    const db = new sqlite3(path.join(__dirname, '../sqlite.db'));
    
    console.log('Starting migration to add profile_picture column to users table...');
    
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasProfilePicture = tableInfo.some(column => column.name === 'profile_picture');
    
    if (hasProfilePicture) {
      console.log('Column profile_picture already exists. No migration needed.');
    } else {
      // Add the column
      db.prepare("ALTER TABLE users ADD COLUMN profile_picture TEXT").run();
      console.log('Successfully added profile_picture column to users table');
    }
    
    db.close();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();