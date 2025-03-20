import Database from "better-sqlite3";
import { complaints, type InsertComplaint } from "@shared/schema";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

export class ComplaintStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const sqlite = new Database("complaints.db");
    this.db = drizzle(sqlite);

    // Initialize the complaints table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createComplaint(data: InsertComplaint) {
    const [newComplaint] = await this.db
      .insert(complaints)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return newComplaint;
  }

  async getAllComplaints() {
    return await this.db
      .select()
      .from(complaints)
      .orderBy(sql`created_at DESC`);
  }
}

export const complaintStorage = new ComplaintStorage();
