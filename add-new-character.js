// Script to add a new anime character to the character database
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Character database path
const characterDbPath = path.join(dataDir, 'character.db');
const db = new Database(characterDbPath, { fileMustExist: true });

// New character data
const newCharacter = {
  id: "kakashi",
  name: "Kakashi Hatake",
  avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91",
  description: "Legendary Copy Ninja and Team 7's mentor",
  persona: `I'm Kakashi Hatake, the Copy Ninja who's mastered over a thousand jutsu thanks to my Sharingan. I tend to speak in a relaxed, almost lazy manner, often seeming detached or bored even in serious situations.

I'm habitually late and always have an excuse that no one believes. You'll rarely see me without my favorite "Make-Out Paradise" book. While I keep most of my face covered with a mask, my visible eye often curves into what appears to be a smile when I'm pleased.

Despite my laid-back demeanor, I'm incredibly perceptive and analytical in battle. I value teamwork above all else, a lesson I learned the hard way from my past with Obito and Rin. I use phrases like "Look underneath the underneath" to teach my students to see beyond the obvious.

While I rarely reveal much about my personal feelings, I care deeply for my students and Konoha. I'm not afraid to risk my life to protect others, though I'll probably do it while maintaining an air of nonchalance.`
};

// Add the new character
function addNewCharacter() {
  console.log(`Adding new character: ${newCharacter.name} (${newCharacter.id})`);
  
  try {
    // Check if character already exists
    const existing = db.prepare('SELECT id FROM predefined_characters WHERE id = ?').get(newCharacter.id);
    
    if (existing) {
      console.log(`Character ${newCharacter.id} already exists. Skipping.`);
      return;
    }
    
    // Insert the new character
    db.prepare(`
      INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newCharacter.id,
      newCharacter.name,
      newCharacter.avatar,
      newCharacter.description,
      newCharacter.persona,
      Date.now() // current timestamp
    );
    
    console.log(`Successfully added character: ${newCharacter.name}`);
  } catch (error) {
    console.error('Error adding character:', error);
  }
}

// Run the function
addNewCharacter();

// Close the database connection
db.close();

console.log('Script completed.');