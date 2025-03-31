// Script to transfer all characters from main database to character.db
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Source database (main sqlite.db)
const mainDb = new Database('./sqlite.db', { fileMustExist: true });

// Character database path (target)
const characterDbPath = path.join(dataDir, 'character.db');
const characterDb = new Database(characterDbPath, { fileMustExist: true });

// Fetch all characters from the main database
function getAllCharactersFromMainDb() {
  console.log('Fetching all characters from main database...');
  try {
    return mainDb.prepare('SELECT id, name, avatar, description, persona, created_at FROM predefined_characters').all();
  } catch (error) {
    console.error('Error fetching characters from main database:', error);
    return [];
  }
}

// Add a character to the character database
function addCharacterToCharacterDb(character) {
  console.log(`Adding/updating character: ${character.name} (${character.id})`);
  
  try {
    // Check if character already exists
    const existing = characterDb.prepare('SELECT id FROM predefined_characters WHERE id = ?').get(character.id);
    
    if (existing) {
      console.log(`Character ${character.id} already exists. Updating...`);
      
      // Update the existing character
      characterDb.prepare(`
        UPDATE predefined_characters 
        SET name = ?, avatar = ?, description = ?, persona = ?, created_at = ?
        WHERE id = ?
      `).run(
        character.name,
        character.avatar,
        character.description,
        character.persona,
        character.created_at,
        character.id
      );
    } else {
      // Insert the new character
      characterDb.prepare(`
        INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        character.id,
        character.name,
        character.avatar,
        character.description,
        character.persona,
        character.created_at
      );
    }
    
    console.log(`Successfully processed character: ${character.name}`);
    return true;
  } catch (error) {
    console.error(`Error adding/updating character ${character.id}:`, error);
    return false;
  }
}

// List all characters in the character database after transfer
function listCharactersInCharacterDb() {
  console.log('\nCharacters in character.db:');
  try {
    const characters = characterDb.prepare('SELECT id, name FROM predefined_characters ORDER BY created_at DESC').all();
    characters.forEach(char => {
      console.log(`- ${char.name} (${char.id})`);
    });
    console.log(`Total: ${characters.length} characters`);
  } catch (error) {
    console.error('Error listing characters:', error);
  }
}

// Main function to transfer all characters
function transferAllCharacters() {
  console.log('Starting character transfer to character.db...');
  
  // Get all characters from the main database
  const characters = getAllCharactersFromMainDb();
  console.log(`Found ${characters.length} characters in main database.`);
  
  if (characters.length === 0) {
    console.log('No characters found to transfer.');
    return;
  }
  
  // Process each character
  let successCount = 0;
  for (const character of characters) {
    if (addCharacterToCharacterDb(character)) {
      successCount++;
    }
  }
  
  console.log(`\nTransfer completed. Successfully transferred ${successCount} of ${characters.length} characters.`);
  
  // List all characters in the character database
  listCharactersInCharacterDb();
}

// Run the transfer function
transferAllCharacters();

// Close database connections
mainDb.close();
characterDb.close();

console.log('\nScript completed.');