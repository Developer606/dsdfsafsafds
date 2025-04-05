// Script to migrate email credentials to admin database
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Ensure the database directory exists
const dbDir = path.join(__dirname, "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to admin database
const adminDb = new Database(path.join(dbDir, "admin.db"));

// Function to check if a key already exists
function keyExists(service) {
  const result = adminDb.prepare('SELECT * FROM api_keys WHERE service = ?').get(service);
  return !!result;
}

// Function to insert a new key
function insertKey(service, key, description) {
  adminDb.prepare('INSERT INTO api_keys (service, key, description) VALUES (?, ?, ?)').run(service, key, description);
  console.log(`Added ${service} to database`);
}

// Function to update an existing key
function updateKey(service, key, description) {
  adminDb.prepare('UPDATE api_keys SET key = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE service = ?').run(key, description, service);
  console.log(`Updated ${service} in database`);
}

// Function to set a key (insert or update)
function setKey(service, key, description) {
  if (!key) {
    console.log(`No value provided for ${service}, skipping`);
    return;
  }

  if (keyExists(service)) {
    updateKey(service, key, description);
  } else {
    insertKey(service, key, description);
  }
}

// Main migration function
async function migrateEmailCredentials() {
  console.log("Starting email credentials migration...");

  try {
    // Migrate SMTP credentials
    setKey('SMTP_USER', process.env.SMTP_USER, 'SMTP username/email for sending emails');
    setKey('SMTP_PASSWORD', process.env.SMTP_PASSWORD, 'SMTP password for sending emails');
    setKey('SMTP_HOST', process.env.SMTP_HOST || 'smtp.gmail.com', 'SMTP host server address');
    setKey('SMTP_PORT', process.env.SMTP_PORT || '587', 'SMTP port number');

    console.log("Email credentials migration completed successfully");
  } catch (error) {
    console.error("Error during email credentials migration:", error);
  }
}

// Execute the migration
migrateEmailCredentials().catch(console.error);