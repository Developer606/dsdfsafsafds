import Database from 'better-sqlite3';
import { notifications, type Notification, type InsertNotification } from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('notifications.db', {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// Initialize the notifications table
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'info',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);

// Create indexes for better performance
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
`);

export class NotificationStorage {
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const stmt = sqlite.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `);

      const result = stmt.get(
        notification.userId,
        notification.title,
        notification.message,
        notification.type || 'info'
      ) as any;

      return {
        id: result.id,
        userId: result.user_id,
        title: result.title,
        message: result.message,
        isRead: Boolean(result.is_read),
        type: result.type,
        createdAt: new Date(result.created_at * 1000)
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      const stmt = sqlite.prepare(`
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
      `);

      const results = stmt.all(userId) as any[];
      return results.map(result => ({
        id: result.id,
        userId: result.user_id,
        title: result.title,
        message: result.message,
        isRead: Boolean(result.is_read),
        type: result.type,
        createdAt: new Date(result.created_at * 1000)
      }));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      const stmt = sqlite.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
      `);

      stmt.run(notificationId, userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async deleteNotification(notificationId: number): Promise<void> {
    try {
      const stmt = sqlite.prepare('DELETE FROM notifications WHERE id = ?');
      stmt.run(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }
}

export const notificationStorage = new NotificationStorage();