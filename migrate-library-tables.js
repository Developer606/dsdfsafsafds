import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to the SQLite database
const db = new sqlite3.Database(path.join(dataDir, 'library.db'));
// Make sure the verbose method is called
sqlite3.verbose();

async function migrateLibraryTables() {
  console.log('Starting library tables migration...');
  
  try {
    // Check if the read_url column exists in manga table
    db.get("PRAGMA table_info(manga)", (err, rows) => {
      if (err) {
        console.error('Error checking manga table:', err);
        return;
      }
      
      // If read_url column doesn't exist, add it
      const hasReadUrl = rows && rows.some(row => row.name === 'read_url');
      if (!hasReadUrl) {
        db.run("ALTER TABLE manga ADD COLUMN read_url TEXT", (err) => {
          if (err) {
            console.error('Error adding read_url column to manga table:', err);
          } else {
            console.log('Successfully added read_url column to manga table');
          }
        });
      } else {
        console.log('read_url column already exists in manga table');
      }
    });

    // Check if the read_url column exists in books table
    db.get("PRAGMA table_info(books)", (err, rows) => {
      if (err) {
        console.error('Error checking books table:', err);
        return;
      }
      
      // If read_url column doesn't exist, add it
      const hasReadUrl = rows && rows.some(row => row.name === 'read_url');
      if (!hasReadUrl) {
        db.run("ALTER TABLE books ADD COLUMN read_url TEXT", (err) => {
          if (err) {
            console.error('Error adding read_url column to books table:', err);
          } else {
            console.log('Successfully added read_url column to books table');
          }
        });
      } else {
        console.log('read_url column already exists in books table');
      }
    });

    // Check if the article_url column exists in news table
    db.get("PRAGMA table_info(news)", (err, rows) => {
      if (err) {
        console.error('Error checking news table:', err);
        return;
      }
      
      // If article_url column doesn't exist, add it
      const hasArticleUrl = rows && rows.some(row => row.name === 'article_url');
      if (!hasArticleUrl) {
        db.run("ALTER TABLE news ADD COLUMN article_url TEXT", (err) => {
          if (err) {
            console.error('Error adding article_url column to news table:', err);
          } else {
            console.log('Successfully added article_url column to news table');
          }
        });
      } else {
        console.log('article_url column already exists in news table');
      }
    });

    console.log('Library tables migration completed');
  } catch (error) {
    console.error('Error migrating library tables:', error);
  }
}

// Run the migration
migrateLibraryTables()
  .then(() => {
    console.log('Library tables migration script completed');
    // Close the database connection
    db.close();
  })
  .catch((error) => {
    console.error('Error running library tables migration script:', error);
    // Close the database connection
    db.close();
  });