// Script to migrate predefined characters from SQLite to PostgreSQL
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import postgres from "postgres";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { characters } from "./shared/characters.ts";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure paths
const characterDbPath = path.join(__dirname, "data", "character.db");

// Make sure the data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  console.log("Creating data directory...");
  fs.mkdirSync(dataDir, { recursive: true });
}

async function migrateCharactersToPostgres() {
  console.log("Starting character migration to PostgreSQL...");
  
  try {
    // Connect to PostgreSQL
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      process.exit(1);
    }

    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Create predefined_characters table in PostgreSQL if it doesn't exist
    console.log("Ensuring predefined_characters table exists in PostgreSQL...");
    await sql`
      CREATE TABLE IF NOT EXISTS predefined_characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL, 
        persona TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_predefined_chars_name 
      ON predefined_characters(name)
    `;
    
    // First check if there are already characters in PostgreSQL
    const existingPgChars = await sql`SELECT COUNT(*) FROM predefined_characters`;
    const countPg = parseInt(existingPgChars[0].count);
    console.log(`Found ${countPg} existing predefined characters in PostgreSQL`);
    
    // Only proceed with migration if PostgreSQL table is empty
    if (countPg === 0) {
      console.log("PostgreSQL table is empty. Starting migration...");
      
      // Get characters from SQLite if it exists
      if (fs.existsSync(characterDbPath)) {
        console.log(`SQLite database exists at ${characterDbPath}, migrating data...`);
        const sqliteDb = new Database(characterDbPath);
        
        // Get all predefined characters from SQLite
        const sqliteChars = sqliteDb.prepare("SELECT * FROM predefined_characters").all();
        console.log(`Found ${sqliteChars.length} predefined characters in SQLite`);
        
        // Insert characters into PostgreSQL
        if (sqliteChars.length > 0) {
          for (const character of sqliteChars) {
            console.log(`Migrating character from SQLite: ${character.name} (${character.id})`);
            
            await sql`
              INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
              VALUES (
                ${character.id}, 
                ${character.name}, 
                ${character.avatar}, 
                ${character.description}, 
                ${character.persona}, 
                ${new Date()}
              )
              ON CONFLICT (id) DO NOTHING
            `;
          }
          console.log("Migration from SQLite completed successfully");
        }
      } else {
        // If SQLite database doesn't exist, use hardcoded characters
        console.log("SQLite database not found, using hardcoded characters...");
        
        for (const character of characters) {
          console.log(`Migrating hardcoded character: ${character.name} (${character.id})`);
          
          await sql`
            INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
            VALUES (
              ${character.id}, 
              ${character.name}, 
              ${character.avatar}, 
              ${character.description}, 
              ${character.persona}, 
              ${new Date()}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
        console.log("Migration from hardcoded characters completed successfully");
      }
    } else {
      console.log("PostgreSQL table already has characters. Skipping migration.");
    }
    
    // Verify migration by counting characters in PostgreSQL
    const finalCount = await sql`SELECT COUNT(*) FROM predefined_characters`;
    console.log(`Final count of characters in PostgreSQL: ${finalCount[0].count}`);
    
    console.log("Migration completed successfully");
    await sql.end();
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

migrateCharactersToPostgres();