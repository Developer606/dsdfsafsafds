import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { 
  mangaLibrary,
  bookLibrary,
  newsLibrary
} from "@shared/schema";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

// Define the library database path
const LIBRARY_DB_PATH = path.join(process.cwd(), "data", "library.db");

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(LIBRARY_DB_PATH);

// Create Drizzle ORM instance
export const libraryDb = drizzle(sqlite);

// Initialize the database tables if they don't exist
export async function initializeLibraryDatabase() {
  try {
    console.log("Initializing library database tables...");
    
    // Create manga_library table
    await libraryDb.run(sql`
      CREATE TABLE IF NOT EXISTS manga_library (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        chapters INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'ongoing',
        genre TEXT NOT NULL,
        publisher TEXT,
        rating TEXT,
        tags TEXT NOT NULL,
        release_date TEXT NOT NULL,
        language TEXT DEFAULT 'english',
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create book_library table
    await libraryDb.run(sql`
      CREATE TABLE IF NOT EXISTS book_library (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        pages INTEGER NOT NULL DEFAULT 0,
        isbn TEXT,
        publisher TEXT,
        format TEXT DEFAULT 'paperback',
        genre TEXT NOT NULL,
        tags TEXT NOT NULL,
        release_date TEXT NOT NULL,
        language TEXT DEFAULT 'english',
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create news_library table
    await libraryDb.run(sql`
      CREATE TABLE IF NOT EXISTS news_library (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        image TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL,
        source_url TEXT,
        category TEXT NOT NULL,
        is_highlighted INTEGER DEFAULT 0,
        tags TEXT NOT NULL,
        language TEXT DEFAULT 'english',
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("Library database tables created successfully");
    
    // Create indexes for efficient querying
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_manga_title ON manga_library(title)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_manga_author ON manga_library(author)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_manga_genre ON manga_library(genre)`);
    
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_book_title ON book_library(title)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_book_author ON book_library(author)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_book_genre ON book_library(genre)`);
    
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_news_title ON news_library(title)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_news_author ON news_library(author)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_news_category ON news_library(category)`);
    await libraryDb.run(sql`CREATE INDEX IF NOT EXISTS idx_news_date ON news_library(date)`);
    
    console.log("Library database indexes created successfully");
    
    return true;
  } catch (error) {
    console.error("Error initializing library database:", error);
    return false;
  }
}