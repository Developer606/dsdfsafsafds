import Database from 'better-sqlite3';

// Open the database connection
const db = new Database('./sqlite.db');

// Execute a transaction to ensure atomicity
db.exec('BEGIN TRANSACTION;');

try {
  // Check if the column already exists
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const columnExists = tableInfo.some(col => col.name === 'public_key');
  
  if (!columnExists) {
    // Add the publicKey column to the users table if it doesn't exist
    db.exec('ALTER TABLE users ADD COLUMN public_key TEXT;');
    console.log('Successfully added public_key column to users table');
  } else {
    console.log('Column public_key already exists in users table');
  }
  
  // Commit the transaction
  db.exec('COMMIT;');
  console.log('Migration completed successfully');
} catch (error) {
  // Rollback the transaction in case of an error
  db.exec('ROLLBACK;');
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  // Close the database connection
  db.close();
}