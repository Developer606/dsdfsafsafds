// Script to migrate characters from sqlite.db to data/character.db
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

async function migrateToCharacterDb() {
  console.log("Starting migration to character.db...");
  
  try {
    // Open both databases
    const mainDb = new Database("./sqlite.db");
    const characterDb = new Database("./data/character.db");
    
    // Get the characters from the main database
    const characters = mainDb.prepare("SELECT * FROM predefined_characters").all();
    console.log(`Found ${characters.length} characters in the main database`);
    
    if (characters.length > 0) {
      // Insert each character into the character database
      const stmt = characterDb.prepare(`
        INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const char of characters) {
        console.log(`Migrating character: ${char.name} (${char.id})`);
        
        // Insert the character into the database
        stmt.run(
          char.id,
          char.name,
          char.avatar,
          char.description,
          char.persona,
          char.created_at
        );
      }
      
      console.log(`Successfully migrated ${characters.length} characters to character.db`);
    } else {
      console.log("No characters found in the main database. Migration not needed.");
    }
    
  } catch (error) {
    console.error("Error during character migration:", error);
  }
}

// Run the migration
migrateToCharacterDb();