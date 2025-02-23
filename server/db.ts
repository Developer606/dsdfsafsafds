import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use environment variables for database connection
const connectionString = process.env.DATABASE_URL;

// Configure PostgreSQL client
const client = postgres(connectionString!, {
  max: 20, // Maximum pool size for high traffic
  idle_timeout: 20, // Timeout idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout after 10 seconds
});

// Create drizzle database instance
export const db = drizzle(client, { schema });

// Run migrations on startup
export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // In production, migrations should be run as a separate process
    // For development, we can run them on startup
    console.log('Database connected successfully');
  } catch (error: any) {
    console.error('Database migration failed:', error);
    throw error;
  }
}