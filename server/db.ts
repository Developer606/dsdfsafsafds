import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

async function syncMissingColumns() {
  console.log('Checking for missing columns...');
  try {
    // Get current table schemas
    const tables = Object.entries(schema).filter(([_, value]) => 
      typeof value === 'object' && 'name' in value && typeof value.name === 'string'
    );

    for (const [tableName, table] of tables) {
      if (!('name' in table)) continue;

      const tableNameStr = table.name.toString();
      console.log(`Checking table: ${tableNameStr}`);

      // Get existing columns
      const existingColumns = await db.execute(sql.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableNameStr}';
      `));

      // Get expected columns from schema
      const schemaColumns = Object.entries(table).filter(([key]) => 
        !['name', 'schema', '$inferSelect', '$inferInsert'].includes(key)
      );

      const existingColumnNames = existingColumns.rows.map(row => row.column_name);

      // Add missing columns
      for (const [columnName, column] of schemaColumns) {
        if (!existingColumnNames.includes(columnName)) {
          console.log(`Adding missing column ${columnName} to ${tableNameStr}`);

          // Determine SQL type and constraints
          let columnDef = '';
          if ('notNull' in column && column.notNull) {
            columnDef += ' NOT NULL';
          }
          if ('default' in column && column.default !== undefined) {
            const defaultValue = typeof column.default === 'string' 
              ? `'${column.default}'` 
              : column.default;
            columnDef += ` DEFAULT ${defaultValue}`;
          }

          // Get the SQL data type
          const dataType = column.dataType || 'text';

          await db.execute(sql.raw(`
            ALTER TABLE "${tableNameStr}" 
            ADD COLUMN IF NOT EXISTS "${columnName}" ${dataType}${columnDef};
          `));
        }
      }
    }
    console.log('Column synchronization completed');
  } catch (error) {
    console.error('Error syncing columns:', error);
    throw error;
  }
}

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
      console.log('Tables already exist, checking for missing columns...');
      await syncMissingColumns();
    }
  } catch (error: any) {
    // Ignore specific error about relations already existing
    if (error.code === '42P07') {
      console.log('Tables already exist, checking for missing columns...');
      await syncMissingColumns();
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
    return result.rows[0]?.exists || false;
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}