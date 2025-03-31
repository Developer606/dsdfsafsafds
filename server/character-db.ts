import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@shared/schema';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Configure SQLite connection for characters
const characterDbPath = path.join(dataDir, 'character.db');
const characterSqlite = new Database(characterDbPath, {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
characterSqlite.pragma('journal_mode = WAL');
characterSqlite.pragma('synchronous = NORMAL');
characterSqlite.pragma('foreign_keys = ON');

// Create the drizzle connection
export const characterDb = drizzle(characterSqlite, { schema });

/**
 * Ensure the character database has the necessary tables and indexes
 */
export async function initializeCharacterDb() {
  console.log('Initializing character database...');
  try {
    // Create predefined_characters table if it doesn't exist
    characterSqlite.exec(`
      CREATE TABLE IF NOT EXISTS predefined_characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL,
        persona TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        time TEXT
      )
    `);

    // Create index for faster lookups
    characterSqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_predefined_chars_name 
      ON predefined_characters(name)
    `);

    console.log('Character database initialized successfully');
  } catch (error) {
    console.error('Error initializing character database:', error);
    throw error;
  }
}

/**
 * Get all predefined characters from the character database
 */
export async function getAllPredefinedCharactersFromDb(): Promise<schema.PredefinedCharacter[]> {
  try {
    const characters = characterSqlite
      .prepare('SELECT id, name, avatar, description, persona, created_at, time FROM predefined_characters')
      .all();
    
    // Convert created_at timestamps to Date objects
    return characters.map((char: any) => ({
      id: char.id,
      name: char.name,
      avatar: char.avatar,
      description: char.description,
      persona: char.persona,
      createdAt: new Date(char.created_at),
      time: char.time
    })) as schema.PredefinedCharacter[];
  } catch (error) {
    console.error('Error fetching predefined characters:', error);
    return [];
  }
}

/**
 * Get a predefined character by ID from the character database
 */
export async function getPredefinedCharacterByIdFromDb(id: string): Promise<schema.PredefinedCharacter | undefined> {
  try {
    const character = characterSqlite
      .prepare('SELECT id, name, avatar, description, persona, created_at, time FROM predefined_characters WHERE id = ?')
      .get(id) as any;
    
    if (!character) {
      return undefined;
    }
    
    // Convert created_at timestamp to Date object
    return {
      id: character.id,
      name: character.name,
      avatar: character.avatar,
      description: character.description,
      persona: character.persona,
      createdAt: new Date(character.created_at),
      time: character.time
    } as schema.PredefinedCharacter;
  } catch (error) {
    console.error(`Error fetching predefined character with ID ${id}:`, error);
    return undefined;
  }
}

/**
 * Create a new predefined character in the character database
 */
export async function createPredefinedCharacterInDb(
  character: schema.InsertPredefinedCharacter
): Promise<schema.PredefinedCharacter> {
  try {
    const now = Date.now();
    const readableTime = new Date(now).toLocaleString();
    
    characterSqlite
      .prepare(`
        INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at, time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        character.id,
        character.name,
        character.avatar,
        character.description,
        character.persona,
        now,
        readableTime
      );

    return {
      ...character,
      createdAt: new Date(now),
      time: readableTime
    };
  } catch (error) {
    console.error('Error creating predefined character:', error);
    throw error;
  }
}

/**
 * Update a predefined character in the character database
 */
export async function updatePredefinedCharacterInDb(
  id: string,
  character: Partial<schema.InsertPredefinedCharacter>
): Promise<schema.PredefinedCharacter> {
  try {
    // Get the current character to merge with updates
    const currentCharacter = await getPredefinedCharacterByIdFromDb(id);
    if (!currentCharacter) {
      throw new Error(`Character with ID ${id} not found`);
    }

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    // Always update the time field to reflect the update
    const now = Date.now();
    const readableTime = new Date(now).toLocaleString();
    updateFields.push('time = ?');
    params.push(readableTime);

    if (character.name !== undefined) {
      updateFields.push('name = ?');
      params.push(character.name);
    }

    if (character.avatar !== undefined) {
      updateFields.push('avatar = ?');
      params.push(character.avatar);
    }

    if (character.description !== undefined) {
      updateFields.push('description = ?');
      params.push(character.description);
    }

    if (character.persona !== undefined) {
      updateFields.push('persona = ?');
      params.push(character.persona);
    }

    // If no fields to update, return the current character
    if (updateFields.length === 0) {
      return currentCharacter;
    }

    // Add ID as the last parameter
    params.push(id);

    // Execute the update
    characterSqlite
      .prepare(`
        UPDATE predefined_characters 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `)
      .run(...params);

    // Get the updated character
    const updatedCharacter = await getPredefinedCharacterByIdFromDb(id);
    if (!updatedCharacter) {
      throw new Error('Failed to retrieve updated character');
    }

    return updatedCharacter;
  } catch (error) {
    console.error(`Error updating predefined character with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a predefined character from the character database
 */
export async function deletePredefinedCharacterFromDb(id: string): Promise<void> {
  try {
    characterSqlite
      .prepare('DELETE FROM predefined_characters WHERE id = ?')
      .run(id);
  } catch (error) {
    console.error(`Error deleting predefined character with ID ${id}:`, error);
    throw error;
  }
}