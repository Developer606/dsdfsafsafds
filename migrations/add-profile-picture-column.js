const { db } = require('../server/db');

async function addProfilePictureColumn() {
  try {
    // Check if the profile_picture column already exists
    const columnsResult = await db.prepare("PRAGMA table_info(users)").all();
    const profilePictureColumnExists = columnsResult.some(col => col.name === 'profile_picture');

    if (!profilePictureColumnExists) {
      // Add the profile_picture column if it doesn't exist
      await db.prepare("ALTER TABLE users ADD COLUMN profile_picture TEXT").run();
      console.log("Added profile_picture column to users table");
    } else {
      console.log("profile_picture column already exists in users table");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
addProfilePictureColumn();