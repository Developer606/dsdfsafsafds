import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

/**
 * Migration to create the encryption-related tables
 */
async function main() {
  console.log("Creating encryption tables...");
  
  // Connect to the database
  const sqlite = new Database('./sqlite.db');
  const db = drizzle(sqlite);
  
  // Run the SQL directly since we're doing a custom migration
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      other_user_id INTEGER NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(user_id, other_user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (other_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_encryption_keys_user_id ON encryption_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_keys_user_id ON conversation_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_keys_other_user_id ON conversation_keys(other_user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_keys_user_pair ON conversation_keys(user_id, other_user_id);
  `);

  console.log("Encryption tables created successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });