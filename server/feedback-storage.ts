import Database from 'better-sqlite3';
import { feedback, type InsertFeedback } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export class FeedbackStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const sqlite = new Database('feedback.db');
    this.db = drizzle(sqlite);

    // Initialize the feedback table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createFeedback(data: InsertFeedback) {
    const [newFeedback] = await this.db.insert(feedback).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return newFeedback;
  }

  async getAllFeedback() {
    return await this.db.select().from(feedback).orderBy(sql`created_at DESC`);
  }
}

export const feedbackStorage = new FeedbackStorage();