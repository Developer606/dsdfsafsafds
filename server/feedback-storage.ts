import Database from 'better-sqlite3';
import { feedback, type InsertFeedback } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import express from 'express';


export class FeedbackStorage {
  private db: ReturnType<typeof drizzle>;
  private uploadDir: string;

  constructor() {
    const sqlite = new Database('feedback.db');
    this.db = drizzle(sqlite);
    this.uploadDir = path.join(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Initialize the feedback table with updated schema
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async saveImage(imageFile: express.Multer.File): Promise<string> {
    const fileExt = path.extname(imageFile.originalname);
    const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, imageFile.buffer);
    return `/uploads/${fileName}`;
  }

  async createFeedback(data: InsertFeedback, imageFile?: express.Multer.File) {
    let imageUrl: string | undefined;

    if (imageFile) {
      imageUrl = await this.saveImage(imageFile);
    }

    const [newFeedback] = await this.db.insert(feedback).values({
      ...data,
      imageUrl,
      createdAt: new Date(),
    }).returning();

    return newFeedback;
  }

  async getAllFeedback() {
    return await this.db.select().from(feedback).orderBy(sql`created_at DESC`);
  }

  async getFeedbackById(id: number) {
    const [result] = await this.db
      .select()
      .from(feedback)
      .where(sql`id = ${id}`);
    return result;
  }

  async updateFeedbackStatus(id: number, status: string) {
    await this.db
      .update(feedback)
      .set({ status })
      .where(sql`id = ${id}`);
  }
}

export const feedbackStorage = new FeedbackStorage();