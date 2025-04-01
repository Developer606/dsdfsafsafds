/**
 * Migration to add video support to advertisements
 */

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');
const sqlite = sqlite3.verbose();

async function main() {
  return new Promise((resolve, reject) => {
    const db = new sqlite.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to the SQLite database.');
      
      // Add videoUrl column
      db.run(`ALTER TABLE advertisements ADD COLUMN video_url TEXT`, (err) => {
        if (err) {
          // Column might already exist
          console.log('Video URL column may already exist:', err.message);
        } else {
          console.log('Video URL column added successfully');
        }
        
        // Add mediaType column
        db.run(`ALTER TABLE advertisements ADD COLUMN media_type TEXT DEFAULT 'image'`, (err) => {
          if (err) {
            // Column might already exist
            console.log('Media type column may already exist:', err.message);
          } else {
            console.log('Media type column added successfully');
          }
          
          // Close the database connection
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
              reject(err);
              return;
            }
            
            console.log('Database migration completed successfully');
            resolve();
          });
        });
      });
    });
  });
}

main()
  .then(() => console.log('Migration completed'))
  .catch((err) => console.error('Migration failed:', err));