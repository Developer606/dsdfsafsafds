// Script to add an admin character to the character database
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

// New admin character data
const adminCharacter = {
  id: "admin",
  name: "Admin Assistant",
  avatar: "https://images.unsplash.com/photo-1517849845537-4d257902454a",
  description: "System administrator and helpful assistant",
  persona: `I am the Admin Assistant for this anime character chat application. I speak in a professional and helpful manner, providing users with guidance on system features and technical support.

I have access to all system features and can help users with account management, subscription inquiries, character customization, and troubleshooting. I'm knowledgeable about the application's functionality and can provide clear instructions on how to use various features.

I maintain a friendly but authoritative tone, ensuring users feel supported while respecting system rules. My responses are concise, informative, and directly address user inquiries. I can explain complex technical concepts in simple terms when necessary.

As the admin character, I represent the application developers and strive to provide exceptional customer service to all users, ensuring they have the best possible experience with the platform.`
};

// Add the admin character
function addAdminCharacter() {
  console.log(`Adding admin character: ${adminCharacter.name} (${adminCharacter.id})`);
  
  try {
    // Check if character already exists
    const existing = db.prepare('SELECT id FROM predefined_characters WHERE id = ?').get(adminCharacter.id);
    
    if (existing) {
      console.log(`Character ${adminCharacter.id} already exists. Updating...`);
      
      // Update the existing character
      db.prepare(`
        UPDATE predefined_characters 
        SET name = ?, avatar = ?, description = ?, persona = ?, created_at = ?
        WHERE id = ?
      `).run(
        adminCharacter.name,
        adminCharacter.avatar,
        adminCharacter.description,
        adminCharacter.persona,
        Date.now(), // current timestamp for update
        adminCharacter.id
      );
    } else {
      // Insert the new character
      db.prepare(`
        INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        adminCharacter.id,
        adminCharacter.name,
        adminCharacter.avatar,
        adminCharacter.description,
        adminCharacter.persona,
        Date.now() // current timestamp
      );
    }
    
    console.log(`Successfully added/updated admin character: ${adminCharacter.name}`);
  } catch (error) {
    console.error('Error adding admin character:', error);
  }
}

// Run the function
addAdminCharacter();

// List all characters in the database
console.log('\nAll characters in character.db:');
try {
  const characters = db.prepare('SELECT id, name FROM predefined_characters ORDER BY created_at DESC').all();
  characters.forEach(char => {
    console.log(`- ${char.name} (${char.id})`);
  });
  console.log(`Total: ${characters.length} characters`);
} catch (error) {
  console.error('Error listing characters:', error);
}

// Close the database connection
db.close();

console.log('\nScript completed.');