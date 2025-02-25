import Database from 'better-sqlite3';
import { feedback, type InsertFeedback } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export class FeedbackStorage {
  private db: ReturnType<typeof drizzle>;
  
  constructor() {
    const sqlite = new Database('feedback.db');
    this.db = drizzle(sqlite);
  }

  async createFeedback(data: InsertFeedback) {
    const [newFeedback] = await this.db.insert(feedback).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return newFeedback;
  }

  async getAllFeedback() {
    return await this.db.select().from(feedback);
  }
}

export const feedbackStorage = new FeedbackStorage();
