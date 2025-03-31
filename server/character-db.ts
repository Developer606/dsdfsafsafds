import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { eq } from "drizzle-orm";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Configure SQLite for character database
const characterDbPath = path.join(dataDir, "character.db");
const characterSqlite = new Database(characterDbPath, {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
characterSqlite.pragma("journal_mode = WAL");
characterSqlite.pragma("synchronous = NORMAL");
characterSqlite.pragma("foreign_keys = ON");

// Create connection with schema
export const characterDb = drizzle(characterSqlite, { schema });

/**
 * Ensure the character database has the necessary tables and indexes
 */
export async function initializeCharacterDb() {
  console.log("Initializing character database...");
  
  try {
    // Ensure the predefined_characters table exists
    characterSqlite.exec(`
      CREATE TABLE IF NOT EXISTS predefined_characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL,
        persona TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    
    // Create index for faster lookups
    characterSqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_predefined_chars_name 
      ON predefined_characters(name)
    `);
    
    console.log("Character database initialized successfully");
  } catch (error) {
    console.error("Error initializing character database:", error);
    throw error;
  }
}

/**
 * Get all predefined characters from the character database
 */
export async function getAllPredefinedCharactersFromDb(): Promise<schema.PredefinedCharacter[]> {
  return await characterDb.select().from(schema.predefinedCharacters);
}

/**
 * Get a predefined character by ID from the character database
 */
export async function getPredefinedCharacterByIdFromDb(id: string): Promise<schema.PredefinedCharacter | undefined> {
  const [character] = await characterDb
    .select()
    .from(schema.predefinedCharacters)
    .where(eq(schema.predefinedCharacters.id, id));
  
  return character;
}

/**
 * Create a new predefined character in the character database
 */
export async function createPredefinedCharacterInDb(
  character: schema.InsertPredefinedCharacter
): Promise<schema.PredefinedCharacter> {
  const [newCharacter] = await characterDb
    .insert(schema.predefinedCharacters)
    .values({
      ...character,
      createdAt: new Date()
    })
    .returning();
  
  return newCharacter;
}

/**
 * Update a predefined character in the character database
 */
export async function updatePredefinedCharacterInDb(
  id: string, 
  character: Partial<schema.InsertPredefinedCharacter>
): Promise<schema.PredefinedCharacter> {
  const [updatedCharacter] = await characterDb
    .update(schema.predefinedCharacters)
    .set({
      ...character,
    })
    .where(eq(schema.predefinedCharacters.id, id))
    .returning();
  
  return updatedCharacter;
}

/**
 * Delete a predefined character from the character database
 */
export async function deletePredefinedCharacterFromDb(id: string): Promise<void> {
  await characterDb
    .delete(schema.predefinedCharacters)
    .where(eq(schema.predefinedCharacters.id, id));
}