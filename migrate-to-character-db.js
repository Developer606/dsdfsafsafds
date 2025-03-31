// migrate-to-character-db.js
// This script migrates predefined characters from the main database to the separate character database
// Run this script with: node migrate-to-character-db.js

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Convert ESM file/dir paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure paths
const mainDbPath = path.join(__dirname, 'sqlite.db');
const dataDir = path.join(__dirname, 'data');
const characterDbPath = path.join(dataDir, 'character.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to databases
const mainDb = new Database(mainDbPath, { fileMustExist: true });
const characterDb = new Database(characterDbPath, { fileMustExist: false });

// Enable WAL mode for better performance
characterDb.pragma('journal_mode = WAL');
characterDb.pragma('synchronous = NORMAL');
characterDb.pragma('foreign_keys = ON');

// Create the character table if it doesn't exist
characterDb.exec(`
  CREATE TABLE IF NOT EXISTS predefined_characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    description TEXT NOT NULL,
    persona TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index for faster lookups
characterDb.exec(`
  CREATE INDEX IF NOT EXISTS idx_predefined_chars_name 
  ON predefined_characters(name)
`);

async function migrateToCharacterDb() {
  try {
    console.log('Starting migration of predefined characters to character.db...');

    // Get all predefined characters from the main database
    const characters = mainDb.prepare('SELECT * FROM predefined_characters').all();
    console.log(`Found ${characters.length} predefined characters in the main database`);

    if (characters.length === 0) {
      console.log('No characters to migrate');
      return;
    }

    // Insert statement for the character database
    const insertStmt = characterDb.prepare(`
      INSERT OR REPLACE INTO predefined_characters 
      (id, name, avatar, description, persona, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Begin transaction for better performance
    const transaction = characterDb.transaction((chars) => {
      for (const char of chars) {
        console.log(`Migrating character: ${char.name} (${char.id})`);
        insertStmt.run(
          char.id,
          char.name,
          char.avatar,
          char.description,
          char.persona,
          char.created_at || Date.now()
        );
      }
    });

    // Execute transaction
    transaction(characters);

    // Verify the migration
    const migratedCount = characterDb.prepare('SELECT COUNT(*) as count FROM predefined_characters').get();
    console.log(`Migration complete. ${migratedCount.count} characters now in character.db`);

    // List all characters in the character database
    const migratedChars = characterDb.prepare('SELECT id, name FROM predefined_characters').all();
    console.log('Migrated characters:');
    migratedChars.forEach(char => {
      console.log(`- ${char.name} (${char.id})`);
    });

  } catch (error) {
    console.error('Error migrating characters:', error);
  } finally {
    // Close database connections
    mainDb.close();
    characterDb.close();
  }
}

// Run the migration
migrateToCharacterDb();