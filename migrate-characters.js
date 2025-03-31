// Script to migrate hardcoded characters to the database
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { characters } from "./shared/characters.ts";
import { predefinedCharacters } from "./shared/schema.ts";

async function migrateCharacters() {
  console.log("Starting character migration...");
  
  try {
    // Open the SQLite database
    const sqlite = new Database("./sqlite.db");
    const db = drizzle(sqlite);
    
    // Create the predefined_characters table if it doesn't exist
    console.log("Creating predefined_characters table if it doesn't exist...");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS predefined_characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL,
        persona TEXT NOT NULL,
        created_at DATETIME NOT NULL
      )
    `);
    
    // Check if there are any predefined characters in the database
    const existingChars = await db.select().from(predefinedCharacters);
    console.log(`Found ${existingChars.length} existing predefined characters in the database`);
    
    if (existingChars.length === 0) {
      console.log("No predefined characters found in database. Migrating hardcoded characters...");
      
      // Insert each character from the hardcoded list
      for (const character of characters) {
        console.log(`Migrating character: ${character.name} (${character.id})`);
        
        // Insert the character into the database
        await db.insert(predefinedCharacters).values({
          id: character.id,
          name: character.name,
          avatar: character.avatar,
          description: character.description,
          persona: character.persona,
          createdAt: new Date()
        });
      }
      
      console.log(`Successfully migrated ${characters.length} characters to the database`);
    } else {
      console.log("Predefined characters already exist in the database. No migration needed.");
      
      // Optional: List the characters already in the database
      for (const char of existingChars) {
        console.log(`- ${char.name} (${char.id})`);
      }
    }
  } catch (error) {
    console.error("Error during character migration:", error);
  }
}

// Run the migration
migrateCharacters();