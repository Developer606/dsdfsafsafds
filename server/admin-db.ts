import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./admin-schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./auth";
import * as fs from "fs";
import * as path from "path";

// Configure SQLite for admin database
const sqlite = new Database("admin.db", {
  fileMustExist: false,
});

// Enable optimizations
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

// Create connection
export const adminDb = drizzle(sqlite, { schema });

// Function to initialize admin database
export async function initializeAdminDb() {
  console.log("Initializing admin database...");
  try {
    // Create tables
    const migrationQueries = [
      `CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        key TEXT NOT NULL,
        service TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    // Execute each creation query in a transaction
    sqlite.transaction(() => {
      for (const query of migrationQueries) {
        sqlite.prepare(query).run();
      }
    })();

    console.log("Admin database tables created successfully");

    // Check if default admin exists, create if not
    await createDefaultAdmin();
    
    // Migrate API keys from JSON if needed
    await migrateApiKeysFromJson();

    console.log("Admin database initialization completed");
    return true;
  } catch (error: any) {
    console.error("Admin database initialization failed:", error);
    throw error;
  }
}

// Create default admin user if not exists
async function createDefaultAdmin() {
  try {
    const admin = await adminDb.select().from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, "admin"))
      .execute();

    if (admin.length === 0) {
      // Create default admin with password hash
      const hashedPassword = await hashPassword("admin123");
      await adminDb.insert(schema.adminUsers).values({
        username: "admin",
        password: hashedPassword,
      }).execute();
      console.log("Default admin user created");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
}

// Migrate API keys from JSON if needed
async function migrateApiKeysFromJson() {
  try {
    // Path to existing api-keys.json
    const apiKeysPath = path.join(__dirname, "api-keys.json");
    
    // Check if file exists
    if (fs.existsSync(apiKeysPath)) {
      // Read the file
      const apiKeysJson = JSON.parse(fs.readFileSync(apiKeysPath, "utf8"));
      
      // Insert each key into the database
      for (const [name, key] of Object.entries(apiKeysJson)) {
        // Skip empty keys
        if (!key) continue;
        
        // Check if key already exists
        const existingKey = await adminDb.select().from(schema.apiKeys)
          .where(eq(schema.apiKeys.name, name))
          .execute();
        
        if (existingKey.length === 0) {
          await adminDb.insert(schema.apiKeys).values({
            name,
            key: key as string,
            service: name.split("_")[0].toLowerCase(), // Extract service name from key name
          }).execute();
          console.log(`Migrated API key: ${name}`);
        }
      }
      
      console.log("API keys migrated from JSON file");
    }
  } catch (error) {
    console.error("Error migrating API keys:", error);
  }
}

// Get API key by name
export async function getApiKey(name: string): Promise<string | null> {
  try {
    const results = await adminDb.select().from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.name, name),
        eq(schema.apiKeys.active, true)
      ))
      .execute();
    
    if (results.length > 0) {
      return results[0].key;
    }
    return null;
  } catch (error) {
    console.error(`Error getting API key ${name}:`, error);
    return null;
  }
}

// Add or update API key
export async function setApiKey(name: string, key: string, service: string): Promise<boolean> {
  try {
    const existingKey = await adminDb.select().from(schema.apiKeys)
      .where(eq(schema.apiKeys.name, name))
      .execute();
    
    if (existingKey.length > 0) {
      // Update existing key
      await adminDb.update(schema.apiKeys)
        .set({ 
          key, 
          service,
          updatedAt: new Date(),
        })
        .where(eq(schema.apiKeys.name, name))
        .execute();
    } else {
      // Insert new key
      await adminDb.insert(schema.apiKeys).values({
        name,
        key,
        service,
      }).execute();
    }
    return true;
  } catch (error) {
    console.error(`Error setting API key ${name}:`, error);
    return false;
  }
}

// Get all API keys
export async function getAllApiKeys(): Promise<schema.ApiKey[]> {
  try {
    return await adminDb.select().from(schema.apiKeys).execute();
  } catch (error) {
    console.error("Error getting all API keys:", error);
    return [];
  }
}

// Verify admin login
export async function verifyAdminLogin(username: string, password: string): Promise<boolean> {
  try {
    const admin = await adminDb.select().from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, username))
      .execute();
    
    if (admin.length > 0) {
      // Compare password hash
      return await comparePasswords(password, admin[0].password);
    }
    return false;
  } catch (error) {
    console.error("Error verifying admin login:", error);
    return false;
  }
}

// Helper function to compare passwords
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // For simplicity, using direct comparison
    // In a real app, you'd use bcrypt.compare or similar
    const hashedPassword = await hashPassword(supplied);
    return hashedPassword === stored;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}