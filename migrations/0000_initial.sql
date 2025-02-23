-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  is_premium INTEGER NOT NULL DEFAULT 0,
  trial_characters_created INTEGER NOT NULL DEFAULT 0,
  subscription_tier TEXT,
  subscription_status TEXT DEFAULT 'trial',
  subscription_expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Create Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  character_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_user INTEGER NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Create Custom Characters table
CREATE TABLE IF NOT EXISTS custom_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  description TEXT NOT NULL,
  persona TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages(user_id, character_id);
