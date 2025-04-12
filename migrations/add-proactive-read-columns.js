const { db } = require('../server/database');

/**
 * Migration script to add isProactive and isRead columns to the messages table
 * This ensures backward compatibility with existing data
 */
async function addProactiveReadColumns() {
  try {
    console.log('Starting migration: Adding isProactive and isRead columns to messages table...');
    
    // Check if columns already exist
    const tableInfo = await db.prepare('PRAGMA table_info(messages)').all();
    const columns = tableInfo.map(col => col.name);
    
    // Add isProactive column if it doesn't exist
    if (!columns.includes('is_proactive')) {
      console.log('Adding is_proactive column...');
      await db.prepare('ALTER TABLE messages ADD COLUMN is_proactive INTEGER DEFAULT 0').run();
      console.log('is_proactive column added successfully');
    } else {
      console.log('is_proactive column already exists, skipping...');
    }
    
    // Add isRead column if it doesn't exist
    if (!columns.includes('is_read')) {
      console.log('Adding is_read column...');
      await db.prepare('ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 1').run();
      console.log('is_read column added successfully');
    } else {
      console.log('is_read column already exists, skipping...');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addProactiveReadColumns()
  .then(() => {
    console.log('Column addition migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });