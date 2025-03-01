import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import { db } from './db'; // Add this import for user data

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

    // Create scheduled_broadcasts table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduled_for INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        sent INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create indexes for better performance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_time ON scheduled_broadcasts(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_sent ON scheduled_broadcasts(sent);
    `);

    // Verify table creation
    const tablesExist = sqlite.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN ('notifications', 'scheduled_broadcasts')"
    ).get();

    if (tablesExist.count === 2) {
      console.log('Notifications tables initialized successfully');
      return true;
    } else {
      throw new Error('Failed to create notification tables');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    throw error;
  }
}

// Function to get all notifications with user details
export async function getAllNotificationsWithUsers() {
  try {
    // First get all notifications
    const notificationsStmt = sqlite.prepare(`
      SELECT 
        id,
        user_id as userId,
        type,
        title,
        message,
        created_at as createdAt
      FROM notifications
      ORDER BY created_at DESC
    `);

    const notifications = notificationsStmt.all();

    // Then fetch user details from the main database for each notification
    const notificationsWithUsers = await Promise.all(
      notifications.map(async (notification: any) => {
        const [user] = await db
          .select({ username: "username", email: "email" })
          .from("users")
          .where({ id: notification.userId });

        return {
          ...notification,
          username: user?.username || 'Deleted User',
          userEmail: user?.email || 'N/A',
          createdAt: new Date(notification.createdAt).toISOString()
        };
      })
    );

    return notificationsWithUsers;
  } catch (error) {
    console.error('Error fetching notifications:', error);
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

// Function to delete a notification
export async function deleteNotification(notificationId: number) {
  const stmt = sqlite.prepare(`
    DELETE FROM notifications WHERE id = ?
  `);

  try {
    stmt.run(notificationId);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Function to create a scheduled broadcast
export async function createScheduledBroadcast(
  scheduledBroadcast: {
    type: string;
    title: string;
    message: string;
    scheduledFor: number;
  }
) {
  const stmt = sqlite.prepare(`
    INSERT INTO scheduled_broadcasts (type, title, message, scheduled_for)
    VALUES (?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      scheduledBroadcast.type,
      scheduledBroadcast.title,
      scheduledBroadcast.message,
      scheduledBroadcast.scheduledFor
    );
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error creating scheduled broadcast:', error);
    throw error;
  }
}

// Function to get all scheduled broadcasts
export async function getScheduledBroadcasts() {
  const stmt = sqlite.prepare(`
    SELECT 
      id,
      type,
      title,
      message,
      scheduled_for as scheduledFor,
      created_at as createdAt,
      sent
    FROM scheduled_broadcasts
    WHERE sent = 0
    ORDER BY scheduled_for ASC
  `);

  try {
    return stmt.all();
  } catch (error) {
    console.error('Error fetching scheduled broadcasts:', error);
    throw error;
  }
}

// Function to mark a scheduled broadcast as sent
export async function markScheduledBroadcastAsSent(id: number) {
  const stmt = sqlite.prepare(`
    UPDATE scheduled_broadcasts
    SET sent = 1
    WHERE id = ?
  `);

  try {
    stmt.run(id);
    return true;
  } catch (error) {
    console.error('Error marking scheduled broadcast as sent:', error);
    throw error;
  }
}

// Function to delete a scheduled broadcast
export async function deleteScheduledBroadcast(id: number) {
  const stmt = sqlite.prepare(`
    DELETE FROM scheduled_broadcasts
    WHERE id = ?
  `);

  try {
    stmt.run(id);
    return true;
  } catch (error) {
    console.error('Error deleting scheduled broadcast:', error);
    throw error;
  }
}

// Function to get notifications table structure
export async function getNotificationsTableInfo() {
  const stmt = sqlite.prepare(`
    SELECT 
      'notifications' as table_name,
      sql as table_structure
    FROM sqlite_master 
    WHERE type='table' AND name='notifications'
    UNION
    SELECT 
      'scheduled_broadcasts' as table_name,
      sql as table_structure
    FROM sqlite_master 
    WHERE type='table' AND name='scheduled_broadcasts'
  `);

  try {
    return stmt.all();
  } catch (error) {
    console.error('Error fetching table structure:', error);
    throw error;
  }
}

// Function to get all notifications (raw data)
export async function getAllNotificationsRaw() {
  const stmt = sqlite.prepare(`
    SELECT 
      id,
      user_id,
      type,
      title,
      message,
      read,
      created_at,
      datetime(created_at/1000, 'unixepoch') as formatted_date
    FROM notifications 
    ORDER BY created_at DESC
  `);

  try {
    return stmt.all();
  } catch (error) {
    console.error('Error fetching raw notifications:', error);
    throw error;
  }
}

// Function to get all scheduled broadcasts (raw data)
export async function getScheduledBroadcastsRaw() {
  const stmt = sqlite.prepare(`
    SELECT 
      id,
      type,
      title,
      message,
      scheduled_for,
      datetime(scheduled_for/1000, 'unixepoch') as formatted_schedule_time,
      created_at,
      datetime(created_at/1000, 'unixepoch') as formatted_create_time,
      sent
    FROM scheduled_broadcasts 
    ORDER BY scheduled_for DESC
  `);

  try {
    return stmt.all();
  } catch (error) {
    console.error('Error fetching raw scheduled broadcasts:', error);
    throw error;
  }
}