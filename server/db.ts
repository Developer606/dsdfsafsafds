import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Run migrations on startup
export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // Check if tables exist first
    const tablesExist = await checkTablesExist();

    if (!tablesExist) {
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('Database migrations completed successfully');
    } else {
      console.log('Tables already exist, skipping initial migration');
    }
  } catch (error: any) {
    // Ignore specific error about relations already existing
    if (error.code === '42P07') {
      console.log('Tables already exist, continuing startup...');
      return;
    }
    console.error('Database migration failed:', error);
    throw error;
  }
}

async function checkTablesExist() {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    return result[0]?.exists || false;
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}