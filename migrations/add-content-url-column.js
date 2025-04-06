// Migration script to add content_url column to library tables
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize the SQLite database
const sqlite = new Database(path.join(dataDir, 'library.db'));

async function runMigration() {
  try {
    // Add content_url column to manga table if it doesn't exist
    console.log("Adding content_url column to manga table...");
    const mangaTableInfo = sqlite.prepare("PRAGMA table_info(manga)").all();
    const mangaHasContentUrl = mangaTableInfo.some(column => column.name === 'content_url');
    
    if (!mangaHasContentUrl) {
      sqlite.prepare("ALTER TABLE manga ADD COLUMN content_url TEXT").run();
      console.log("✅ Added content_url column to manga table");
    } else {
      console.log("✅ content_url column already exists in manga table");
    }

    // Add content_url column to books table if it doesn't exist
    console.log("Adding content_url column to books table...");
    const booksTableInfo = sqlite.prepare("PRAGMA table_info(books)").all();
    const booksHasContentUrl = booksTableInfo.some(column => column.name === 'content_url');
    
    if (!booksHasContentUrl) {
      sqlite.prepare("ALTER TABLE books ADD COLUMN content_url TEXT").run();
      console.log("✅ Added content_url column to books table");
    } else {
      console.log("✅ content_url column already exists in books table");
    }

    // Add content_url column to news table if it doesn't exist
    console.log("Adding content_url column to news table...");
    const newsTableInfo = sqlite.prepare("PRAGMA table_info(news)").all();
    const newsHasContentUrl = newsTableInfo.some(column => column.name === 'content_url');
    
    if (!newsHasContentUrl) {
      sqlite.prepare("ALTER TABLE news ADD COLUMN content_url TEXT").run();
      console.log("✅ Added content_url column to news table");
    } else {
      console.log("✅ content_url column already exists in news table");
    }

    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    // Close the database connection
    sqlite.close();
  }
}

// Run the migration
runMigration();