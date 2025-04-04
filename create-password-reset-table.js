// Script to create the password reset attempts table
import Database from 'better-sqlite3';
const db = new Database('./sqlite.db');

console.log('Creating password reset attempts table...');

// Create the table
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip TEXT
  )
`);

// Create indexes for efficient querying
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_password_reset_user_id 
  ON password_reset_attempts(user_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_password_reset_timestamp 
  ON password_reset_attempts(timestamp)
`);

console.log('Password reset attempts table created successfully.');

// Close the database connection
db.close();