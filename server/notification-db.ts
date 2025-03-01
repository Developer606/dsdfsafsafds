import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('notifications.db', {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = OFF'); // Disable foreign keys since we're using multiple databases

// Create connection
export const notificationDb = drizzle(sqlite, { schema });

// Function to initialize notifications table if needed
export async function initializeNotifications() {
  try {
    console.log('Starting notifications database initialization...');

    // Create notifications table if it doesn't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create indexes for better performance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
    `);

    // Verify table creation
    const tableExists = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
    ).get();

    if (tableExists) {
      console.log('Notifications table initialized successfully');
      return true;
    } else {
      throw new Error('Failed to create notifications table');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    throw error;
  }
}

// Function to create notifications for all users
export async function createBroadcastNotifications(
  users: Array<{ id: number }>,
  notificationData: {
    type: string;
    title: string;
    message: string;
  }
) {
  const insertStmt = sqlite.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = sqlite.transaction((users) => {
    for (const user of users) {
      insertStmt.run(
        user.id,
        notificationData.type,
        notificationData.title,
        notificationData.message
      );
    }
  });

  try {
    transaction(users);
    console.log(`Broadcast notification created for ${users.length} users`);
    return true;
  } catch (error) {
    console.error('Error creating broadcast notifications:', error);
    throw error;
  }
}