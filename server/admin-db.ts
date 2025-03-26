import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import {
  adminUsers,
  apiKeys,
  type InsertAdminUser,
  type InsertApiKey,
} from "@shared/admin-schema";
import * as schema from "@shared/admin-schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "./auth";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the database directory exists
const dbDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite database
const sqlite = new Database(path.join(dbDir, "admin.db"));
export const adminDb = drizzle(sqlite, { schema });

// Initialize the admin database
export async function initializeAdminDb() {
  console.log("Initializing admin database...");

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL UNIQUE,
      key TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);

  // Initialize default admin user if it doesn't exist
  await initializeDefaultAdmin();

  // Transfer GitHub token to admin database if it exists
  await transferGithubToken();

  console.log("Admin database initialized successfully");
}

// Check for existing admin users
async function initializeDefaultAdmin() {
  try {
    // Check if any admin exists
    const adminCount = await adminDb
      .select({ count: sql`count(*)` })
      .from(adminUsers)
      .get();

    if (!adminCount || adminCount.count === 0) {
      console.log(
        "No admin users found. Please create an admin user through the CLI or API.",
      );
    } else {
      console.log("Admin users exist in the database.");
    }
  } catch (error) {
    console.error("Error checking admin users in database:", error);
  }
}

// Transfer GitHub token to admin database
async function transferGithubToken() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log("No GITHUB_TOKEN found in environment variables");
    return;
  }

  try {
    // Check if GitHub token already exists in the database
    const existingKey = await adminDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.service, "GITHUB_TOKEN"))
      .get();

    if (!existingKey) {
      // Add the token to the database
      await adminDb.insert(apiKeys).values({
        service: "GITHUB_TOKEN",
        key: token,
        description: "GitHub token used for Azure AI services authentication",
      });
      console.log("GitHub token transferred to admin database");
    } else {
      // Update if token has changed
      if (existingKey.key !== token) {
        await adminDb
          .update(apiKeys)
          .set({
            key: token,
            updatedAt: new Date(),
          })
          .where(eq(apiKeys.service, "GITHUB_TOKEN"));
        console.log("GitHub token updated in admin database");
      }
    }
  } catch (error) {
    console.error("Error transferring GitHub token to admin database:", error);
  }
}

// Get API key by service name
export async function getApiKey(service: string): Promise<string | null> {
  try {
    const result = await adminDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.service, service))
      .get();
    return result?.key || null;
  } catch (error) {
    console.error(`Error retrieving ${service} API key:`, error);
    return null;
  }
}

// Set or update API key
export async function setApiKey(
  service: string,
  key: string,
  description?: string,
): Promise<boolean> {
  try {
    const existingKey = await adminDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.service, service))
      .get();

    if (existingKey) {
      await adminDb
        .update(apiKeys)
        .set({
          key: key,
          description: description || existingKey.description,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.service, service));
    } else {
      await adminDb.insert(apiKeys).values({
        service: service,
        key: key,
        description: description,
      });
    }

    return true;
  } catch (error) {
    console.error(`Error setting ${service} API key:`, error);
    return false;
  }
}

// Verify admin credentials
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  try {
    const admin = await adminDb
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .get();

    if (!admin) {
      return false;
    }

    // Import scrypt-related functions
    const { scrypt, randomBytes, timingSafeEqual } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);

    // Compare passwords
    const [hashed, salt] = admin.password.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
    const isValid = timingSafeEqual(hashedBuf, suppliedBuf);

    if (isValid) {
      // Update last login time
      await adminDb
        .update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, admin.id));
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying admin credentials:", error);
    return false;
  }
}

// Add new admin user
export async function addAdminUser(
  userData: InsertAdminUser,
): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(userData.password);

    await adminDb.insert(adminUsers).values({
      ...userData,
      password: hashedPassword,
    });

    return true;
  } catch (error) {
    console.error("Error adding admin user:", error);
    return false;
  }
}

// Get all API keys
export async function getAllApiKeys(): Promise<
  (typeof apiKeys.$inferSelect)[]
> {
  try {
    return await adminDb.select().from(apiKeys);
  } catch (error) {
    console.error("Error retrieving API keys:", error);
    return [];
  }
}
