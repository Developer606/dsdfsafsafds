// Migration to add image_data and video_data columns to user_messages table

async function main() {
  const sqlite3 = require('better-sqlite3');
  const db = sqlite3('sqlite.db');

  console.log('Starting migration: Adding media data columns to user_messages table');

  try {
    // Check if the columns already exist
    const columns = db.prepare("PRAGMA table_info(user_messages)").all();
    const hasImageData = columns.some(col => col.name === 'image_data');
    const hasVideoData = columns.some(col => col.name === 'video_data');

    // Add image_data column if it doesn't exist
    if (!hasImageData) {
      console.log('Adding image_data column to user_messages table');
      db.prepare("ALTER TABLE user_messages ADD COLUMN image_data TEXT").run();
    } else {
      console.log('image_data column already exists in user_messages table');
    }

    // Add video_data column if it doesn't exist
    if (!hasVideoData) {
      console.log('Adding video_data column to user_messages table');
      db.prepare("ALTER TABLE user_messages ADD COLUMN video_data TEXT").run();
    } else {
      console.log('video_data column already exists in user_messages table');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);