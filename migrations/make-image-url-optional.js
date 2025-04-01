// Make image_url optional in advertisements table when video_url is present
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory from ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the advertisement database
const dbPath = path.join(__dirname, '..', 'data', 'advertisement.db');

// Ensure the directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize the database connection
const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('Running migration to make image_url optional for video ads...');
  
  // SQLite doesn't support direct ALTER COLUMN to change nullability
  // We need to recreate the table with the new schema
  
  // Step 1: Create a new temporary table with the updated schema
  db.run(`
    CREATE TABLE advertisements_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT, -- Making this optional by removing NOT NULL
      video_url TEXT,
      media_type TEXT DEFAULT 'image',
      button_text TEXT DEFAULT 'Learn More',
      button_link TEXT NOT NULL,
      button_style TEXT DEFAULT 'primary',
      background_color TEXT DEFAULT '#8B5CF6',
      text_color TEXT DEFAULT '#FFFFFF',
      position INTEGER DEFAULT 0,
      animation_type TEXT DEFAULT 'fade',
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0
    )
  `, function(err) {
    if (err) {
      console.error('Error creating new advertisements table:', err.message);
      return;
    }
    
    // Step 2: Copy data from the old table to the new one
    db.run(`
      INSERT INTO advertisements_new 
      SELECT * FROM advertisements
    `, function(err) {
      if (err) {
        console.error('Error copying data to new advertisements table:', err.message);
        return;
      }
      
      // Step 3: Drop the old table
      db.run(`DROP TABLE advertisements`, function(err) {
        if (err) {
          console.error('Error dropping old advertisements table:', err.message);
          return;
        }
        
        // Step 4: Rename the new table to the original name
        db.run(`ALTER TABLE advertisements_new RENAME TO advertisements`, function(err) {
          if (err) {
            console.error('Error renaming new advertisements table:', err.message);
            return;
          }
          
          // Step 5: Recreate the indices
          db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON advertisements(is_active)', function(err) {
            if (err) {
              console.error('Error recreating index idx_advertisements_is_active:', err.message);
              return;
            }
            
            db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_start_date ON advertisements(start_date)', function(err) {
              if (err) {
                console.error('Error recreating index idx_advertisements_start_date:', err.message);
                return;
              }
              
              db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_end_date ON advertisements(end_date)', function(err) {
                if (err) {
                  console.error('Error recreating index idx_advertisements_end_date:', err.message);
                  return;
                }
                
                db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_position ON advertisements(position)', function(err) {
                  if (err) {
                    console.error('Error recreating index idx_advertisements_position:', err.message);
                    return;
                  }
                  
                  console.log('Successfully updated advertisements table to make image_url optional');
                  // Close the database connection when done
                  db.close();
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run the migration
main();