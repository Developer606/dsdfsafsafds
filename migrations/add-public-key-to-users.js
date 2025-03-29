import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

// Fix for ES module path resolution
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function main() {
  console.log('Adding publicKey column to users table...');
  
  try {
    // Check if column already exists
    const tableInfo = await db.all(sql`PRAGMA table_info(users)`);
    const columnExists = tableInfo.some(col => col.name === 'public_key');
    
    if (!columnExists) {
      // Add the publicKey column to the users table
      await db.run(sql`ALTER TABLE users ADD COLUMN public_key TEXT`);
      console.log('Successfully added publicKey column to users table');
    } else {
      console.log('Column publicKey already exists in users table');
    }
  } catch (error) {
    console.error('Error adding publicKey column:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});