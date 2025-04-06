import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { manga, books, news, type Manga, type Book, type News, type InsertManga, type InsertBook, type InsertNews } from '../shared/schema';
import { eq, like, or } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize the SQLite database
const sqlite = new Database(path.join(dataDir, 'library.db'));
export const libraryDb = drizzle(sqlite);

// Sample data for initial database seeding
const initialMangaData: InsertManga[] = [
  {
    id: "one-piece",
    title: "One Piece",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-oT7YguhEK1TE.jpg",
    description: "Gol D. Roger, a man referred to as the 'Pirate King,' is set to be executed by the World Government. But just before his death, he confirms the existence of a great treasure, One Piece, located somewhere within the vast ocean known as the Grand Line.",
    author: "Eiichiro Oda",
    chapters: 1037,
    tags: JSON.stringify(["Adventure", "Fantasy", "Action"]),
    release_date: "1997-07-22",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "attack-on-titan",
    title: "Attack on Titan",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx53390-1RsuABC34p9u.jpg",
    description: "Several hundred years ago, humans were nearly exterminated by giants. Giants are typically several stories tall, seem to have no intelligence, and devour human beings.",
    author: "Hajime Isayama",
    chapters: 139,
    tags: JSON.stringify(["Action", "Drama", "Horror"]),
    release_date: "2009-09-09",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx87216-c9bSNVD10UuD.png",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself.",
    author: "Koyoharu Gotouge",
    chapters: 205,
    tags: JSON.stringify(["Action", "Supernatural", "Historical"]),
    release_date: "2016-02-15",
    created_at: new Date(),
    updated_at: new Date()
  }
];

const initialBooksData: InsertBook[] = [
  {
    id: "brave-new-world",
    title: "Brave New World",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41le8ej-fiL._SX325_BO1,204,203,200_.jpg",
    description: "Set in a dystopian future, the novel anticipates developments in reproductive technology, sleep-learning, psychological manipulation, and classical conditioning that combine to change society.",
    author: "Aldous Huxley",
    pages: 288,
    tags: JSON.stringify(["Science Fiction", "Dystopian", "Classic"]),
    release_date: "1932-01-01",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "1984",
    title: "1984",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41aM4xOZxaL._SX277_BO1,204,203,200_.jpg",
    description: "The novel is set in Airstrip One, a province of the superstate Oceania in a world of perpetual war, omnipresent government surveillance, and public manipulation.",
    author: "George Orwell",
    pages: 328,
    tags: JSON.stringify(["Dystopian", "Political", "Classic"]),
    release_date: "1949-06-08",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "harry-potter",
    title: "Harry Potter and the Philosopher's Stone",
    cover: "https://images-na.ssl-images-amazon.com/images/I/51UoqRAxwEL._SX331_BO1,204,203,200_.jpg",
    description: "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive.",
    author: "J.K. Rowling",
    pages: 320,
    tags: JSON.stringify(["Fantasy", "Magic", "Adventure"]),
    release_date: "1997-06-26",
    created_at: new Date(),
    updated_at: new Date()
  }
];

const initialNewsData: InsertNews[] = [
  {
    id: "anime-expo-2025",
    title: "Anime Expo 2025 Announces Major Studio Appearances",
    image: "https://images.unsplash.com/photo-1518051870910-a46e30d9db16",
    summary: "Anime Expo organizers have announced an impressive lineup of Japanese animation studios that will be attending next year's event, including MAPPA, Ufotable, and Kyoto Animation.",
    author: "Anime News Network",
    date: "2025-03-15",
    tags: JSON.stringify(["Event", "Industry", "Convention"]),
    source: "AnimeNewsNetwork",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "manga-sales-2025",
    title: "Manga Sales Continue to Break Records in Global Markets",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d",
    summary: "Sales figures for the first quarter of 2025 show manga continuing to outsell traditional comics in North America and Europe by significant margins, with digital sales growing fastest among younger readers.",
    author: "Japan Times",
    date: "2025-04-02",
    tags: JSON.stringify(["Industry", "Sales", "Global"]),
    source: "JapanTimes",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: "anime-streaming-platform",
    title: "New AI-Enhanced Anime Streaming Platform Launches Next Month",
    image: "https://images.unsplash.com/photo-1601513445506-2ae0d022d6e9",
    summary: "A revolutionary new streaming service dedicated to anime will launch next month featuring AI-enhanced upscaling of classic anime series and personalized recommendations based on viewing habits.",
    author: "Tech Anime Journal",
    date: "2025-03-28",
    tags: JSON.stringify(["Technology", "Streaming", "AI"]),
    source: "TechAnimeJournal",
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Initialize database and seed with initial data if needed
export async function initializeLibraryDatabase() {
  try {
    // Create tables if they don't exist
    // This uses the schema defined in shared/schema.ts
    libraryDb.run(`
      CREATE TABLE IF NOT EXISTS manga (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        chapters INTEGER NOT NULL,
        tags TEXT NOT NULL,
        release_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    libraryDb.run(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        pages INTEGER NOT NULL,
        tags TEXT NOT NULL,
        release_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    libraryDb.run(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        image TEXT NOT NULL,
        summary TEXT NOT NULL,
        author TEXT NOT NULL,
        date TEXT NOT NULL,
        tags TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Seed the database with initial data if tables are empty
    await migrateInitialLibraryData();

    console.log("Library database initialized successfully");
  } catch (error) {
    console.error("Error initializing library database:", error);
    throw error;
  }
}

// Manga CRUD operations
export async function getAllManga(): Promise<Manga[]> {
  return libraryDb.select().from(manga).all();
}

export async function getMangaById(id: string): Promise<Manga | undefined> {
  const results = await libraryDb.select().from(manga).where(eq(manga.id, id)).all();
  return results[0];
}

export async function searchManga(query: string): Promise<Manga[]> {
  return libraryDb.select().from(manga).where(
    or(
      like(manga.title, `%${query}%`),
      like(manga.author, `%${query}%`),
      like(manga.description, `%${query}%`)
    )
  ).all();
}

export async function createManga(data: InsertManga): Promise<Manga> {
  await libraryDb.insert(manga).values(data).run();
  return getMangaById(data.id) as Promise<Manga>;
}

export async function updateManga(id: string, data: Partial<InsertManga>): Promise<Manga | undefined> {
  // Create a sanitized copy of the data without id (since it's in the where clause)
  const { id: _, ...updateData } = data;
  
  // Update the record
  await libraryDb.update(manga).set({
    ...updateData,
    updated_at: new Date()
  }).where(eq(manga.id, id)).run();
  
  return getMangaById(id);
}

export async function deleteManga(id: string): Promise<void> {
  await libraryDb.delete(manga).where(eq(manga.id, id)).run();
}

// Books CRUD operations
export async function getAllBooks(): Promise<Book[]> {
  return libraryDb.select().from(books).all();
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const results = await libraryDb.select().from(books).where(eq(books.id, id)).all();
  return results[0];
}

export async function searchBooks(query: string): Promise<Book[]> {
  return libraryDb.select().from(books).where(
    or(
      like(books.title, `%${query}%`),
      like(books.author, `%${query}%`),
      like(books.description, `%${query}%`)
    )
  ).all();
}

export async function createBook(data: InsertBook): Promise<Book> {
  await libraryDb.insert(books).values(data).run();
  return getBookById(data.id) as Promise<Book>;
}

export async function updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined> {
  // Create a sanitized copy of the data without id (since it's in the where clause)
  const { id: _, ...updateData } = data;
  
  // Update the record
  await libraryDb.update(books).set({
    ...updateData,
    updated_at: new Date()
  }).where(eq(books.id, id)).run();
  
  return getBookById(id);
}

export async function deleteBook(id: string): Promise<void> {
  await libraryDb.delete(books).where(eq(books.id, id)).run();
}

// News CRUD operations
export async function getAllNews(): Promise<News[]> {
  return libraryDb.select().from(news).all();
}

export async function getNewsById(id: string): Promise<News | undefined> {
  const results = await libraryDb.select().from(news).where(eq(news.id, id)).all();
  return results[0];
}

export async function searchNews(query: string): Promise<News[]> {
  return libraryDb.select().from(news).where(
    or(
      like(news.title, `%${query}%`),
      like(news.author, `%${query}%`),
      like(news.summary, `%${query}%`)
    )
  ).all();
}

export async function createNews(data: InsertNews): Promise<News> {
  await libraryDb.insert(news).values(data).run();
  return getNewsById(data.id) as Promise<News>;
}

export async function updateNews(id: string, data: Partial<InsertNews>): Promise<News | undefined> {
  // Create a sanitized copy of the data without id (since it's in the where clause)
  const { id: _, ...updateData } = data;
  
  // Update the record
  await libraryDb.update(news).set({
    ...updateData,
    updated_at: new Date()
  }).where(eq(news.id, id)).run();
  
  return getNewsById(id);
}

export async function deleteNews(id: string): Promise<void> {
  await libraryDb.delete(news).where(eq(news.id, id)).run();
}

// Seed the database with initial data if tables are empty
async function migrateInitialLibraryData() {
  // Check if tables are empty
  const mangaCount = (await libraryDb.select().from(manga).all()).length;
  const booksCount = (await libraryDb.select().from(books).all()).length;
  const newsCount = (await libraryDb.select().from(news).all()).length;

  // Only seed if tables are empty
  if (mangaCount === 0) {
    console.log("Seeding manga table with initial data...");
    for (const item of initialMangaData) {
      await libraryDb.insert(manga).values(item).run();
    }
  }

  if (booksCount === 0) {
    console.log("Seeding books table with initial data...");
    for (const item of initialBooksData) {
      await libraryDb.insert(books).values(item).run();
    }
  }

  if (newsCount === 0) {
    console.log("Seeding news table with initial data...");
    for (const item of initialNewsData) {
      await libraryDb.insert(news).values(item).run();
    }
  }
}