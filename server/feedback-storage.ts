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

    // Initialize the feedback table with updated schema
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better search performance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email);
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
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

  async deleteFeedback(id: number) {
    await this.db.delete(feedback).where(sql`id = ${id}`);
  }

  async getFeedbackStats() {
    const result = await Promise.all([
      this.db.select().from(feedback).all(),
      this.db.select({ count: sql<number>`COUNT(DISTINCT email)` }).from(feedback).get(),
      this.db.select({ count: sql<number>`COUNT(*)` })
        .from(feedback)
        .where(sql`created_at >= datetime('now', '-7 days')`)
        .get(),
    ]);

    return {
      totalFeedback: result[0].length,
      uniqueUsers: result[1]?.count || 0,
      recentFeedback: result[2]?.count || 0,
    };
  }
}

export const feedbackStorage = new FeedbackStorage();