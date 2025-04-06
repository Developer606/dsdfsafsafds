import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to the library database
const db = new sqlite3.Database(join(__dirname, 'data/library.db'));

// Create tables if they don't exist
const createTables = () => {
  return new Promise((resolve, reject) => {
    console.log("Creating tables...");
    // Create manga_library table
    db.run(`
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
    `, (err) => {
      if (err) return reject(err);
      
      // Create book_library table
      db.run(`
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
      `, (err) => {
        if (err) return reject(err);
        
        // Create news_library table
        db.run(`
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
        `, (err) => {
          if (err) return reject(err);
          
          // Create indexes
          db.run(`CREATE INDEX IF NOT EXISTS idx_manga_title ON manga_library(title)`, (err) => {
            if (err) return reject(err);
            db.run(`CREATE INDEX IF NOT EXISTS idx_manga_author ON manga_library(author)`, (err) => {
              if (err) return reject(err);
              db.run(`CREATE INDEX IF NOT EXISTS idx_manga_genre ON manga_library(genre)`, (err) => {
                if (err) return reject(err);
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_book_title ON book_library(title)`, (err) => {
                  if (err) return reject(err);
                  db.run(`CREATE INDEX IF NOT EXISTS idx_book_author ON book_library(author)`, (err) => {
                    if (err) return reject(err);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_book_genre ON book_library(genre)`, (err) => {
                      if (err) return reject(err);
                      
                      db.run(`CREATE INDEX IF NOT EXISTS idx_news_title ON news_library(title)`, (err) => {
                        if (err) return reject(err);
                        db.run(`CREATE INDEX IF NOT EXISTS idx_news_author ON news_library(author)`, (err) => {
                          if (err) return reject(err);
                          db.run(`CREATE INDEX IF NOT EXISTS idx_news_category ON news_library(category)`, (err) => {
                            if (err) return reject(err);
                            db.run(`CREATE INDEX IF NOT EXISTS idx_news_date ON news_library(date)`, (err) => {
                              if (err) return reject(err);
                              resolve();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

// Manga data
const mangaData = [
  {
    id: "one-piece",
    title: "One Piece",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-oT7YguhEK1TE.jpg",
    description: "Gol D. Roger, a man referred to as the 'Pirate King,' is set to be executed by the World Government. But just before his death, he confirms the existence of a great treasure, One Piece, located somewhere within the vast ocean known as the Grand Line.",
    author: "Eiichiro Oda",
    chapters: 1037,
    status: "ongoing",
    genre: "Adventure",
    tags: JSON.stringify(["Adventure", "Fantasy", "Action"]),
    release_date: "1997-07-22",
    language: "english"
  },
  {
    id: "attack-on-titan",
    title: "Attack on Titan",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx53390-1RsuABC34p9u.jpg",
    description: "Several hundred years ago, humans were nearly exterminated by giants. Giants are typically several stories tall, seem to have no intelligence, and devour human beings.",
    author: "Hajime Isayama",
    chapters: 139,
    status: "completed",
    genre: "Action",
    tags: JSON.stringify(["Action", "Drama", "Horror"]),
    release_date: "2009-09-09",
    language: "english"
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx87216-c9bSNVD10UuD.png",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself.",
    author: "Koyoharu Gotouge",
    chapters: 205,
    status: "completed",
    genre: "Action",
    tags: JSON.stringify(["Action", "Supernatural", "Historical"]),
    release_date: "2016-02-15",
    language: "english"
  }
];

// Book data
const bookData = [
  {
    id: "brave-new-world",
    title: "Brave New World",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41le8ej-fiL._SX325_BO1,204,203,200_.jpg",
    description: "Set in a dystopian future, the novel anticipates developments in reproductive technology, sleep-learning, psychological manipulation, and classical conditioning that combine to change society.",
    author: "Aldous Huxley",
    pages: 288,
    isbn: "9780060850524",
    publisher: "Harper Perennial",
    format: "paperback",
    genre: "Science Fiction",
    tags: JSON.stringify(["Science Fiction", "Dystopian", "Classic"]),
    release_date: "1932-01-01",
    language: "english"
  },
  {
    id: "1984",
    title: "1984",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41aM4xOZxaL._SX277_BO1,204,203,200_.jpg",
    description: "The novel is set in Airstrip One, a province of the superstate Oceania in a world of perpetual war, omnipresent government surveillance, and public manipulation.",
    author: "George Orwell",
    pages: 328,
    isbn: "9780451524935",
    publisher: "Signet Classic",
    format: "paperback",
    genre: "Dystopian",
    tags: JSON.stringify(["Dystopian", "Political", "Classic"]),
    release_date: "1949-06-08",
    language: "english"
  },
  {
    id: "harry-potter",
    title: "Harry Potter and the Philosopher's Stone",
    cover: "https://images-na.ssl-images-amazon.com/images/I/51UoqRAxwEL._SX331_BO1,204,203,200_.jpg",
    description: "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive.",
    author: "J.K. Rowling",
    pages: 320,
    isbn: "9781408855652",
    publisher: "Bloomsbury",
    format: "hardcover",
    genre: "Fantasy",
    tags: JSON.stringify(["Fantasy", "Magic", "Adventure"]),
    release_date: "1997-06-26",
    language: "english"
  }
];

// News data
const newsData = [
  {
    id: "anime-expo-2025",
    title: "Anime Expo 2025 Announces Major Studio Appearances",
    image: "https://images.unsplash.com/photo-1518051870910-a46e30d9db16",
    summary: "Anime Expo organizers have announced an impressive lineup of Japanese animation studios that will be attending next year's event, including MAPPA, Ufotable, and Kyoto Animation.",
    content: "Anime Expo, North America's largest celebration of Japanese pop culture, has announced that MAPPA, Ufotable, and Kyoto Animation will all have major presentations at the 2025 event. Each studio is expected to bring exclusive announcements and previews of upcoming projects. This marks the first time all three prestigious animation houses will be present at the same Anime Expo, promising an unprecedented opportunity for fans to engage with the creative forces behind some of the most popular anime series of recent years.",
    author: "Anime News Network",
    date: "2025-03-15",
    source: "AnimeNewsNetwork",
    source_url: "https://www.animenewsnetwork.com",
    category: "Event",
    is_highlighted: 1,
    tags: JSON.stringify(["Event", "Industry", "Convention"]),
    language: "english"
  },
  {
    id: "manga-sales-2025",
    title: "Manga Sales Continue to Break Records in Global Markets",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d",
    summary: "Sales figures for the first quarter of 2025 show manga continuing to outsell traditional comics in North America and Europe by significant margins, with digital sales growing fastest among younger readers.",
    content: "According to industry analysts, manga sales have continued their upward trajectory in global markets throughout the first quarter of 2025. In North America alone, manga revenue surpassed $450 million, representing a 15% increase compared to the same period last year. Europe has seen similar growth, with countries like France, Italy, and Germany reporting record-breaking sales. Digital manga platforms have experienced the most dramatic surge, with a 28% year-over-year increase, particularly among readers aged 16-24. Publishers are expanding their digital offerings in response to this trend, with several major publishing houses announcing enhanced mobile reading applications with multilingual support.",
    author: "Japan Times",
    date: "2025-04-02",
    source: "JapanTimes",
    source_url: "https://www.japantimes.co.jp",
    category: "Industry",
    is_highlighted: 0,
    tags: JSON.stringify(["Industry", "Sales", "Global"]),
    language: "english"
  },
  {
    id: "anime-streaming-platform",
    title: "New AI-Enhanced Anime Streaming Platform Launches Next Month",
    image: "https://images.unsplash.com/photo-1601513445506-2ae0d022d6e9",
    summary: "A revolutionary new streaming service dedicated to anime will launch next month featuring AI-enhanced upscaling of classic anime series and personalized recommendations based on viewing habits.",
    content: "AnimeVerse, a new streaming platform specifically designed for anime enthusiasts, is set to launch next month with several technological innovations. The service will feature AI-enhanced upscaling of classic anime series, bringing decades-old shows into high definition without the artifacts common in traditional upscaling methods. Additionally, the platform will utilize advanced machine learning algorithms to provide highly personalized recommendations based on viewing habits, mood analysis, and even time of day. The subscription service has already secured licensing deals with major studios including Toei Animation, Sunrise, and Production I.G, promising a vast library of both classic and current series. Early access sign-ups begin next week with a promotional discount for founding members.",
    author: "Tech Anime Journal",
    date: "2025-03-28",
    source: "TechAnimeJournal",
    source_url: "https://www.techanimejournal.com",
    category: "Technology",
    is_highlighted: 1,
    tags: JSON.stringify(["Technology", "Streaming", "AI"]),
    language: "english"
  }
];

// Insert data into tables
const insertData = async () => {
  return new Promise((resolve, reject) => {
    console.log("Checking for existing data...");
    
    // Check for existing manga data
    db.get("SELECT COUNT(*) as count FROM manga_library", (err, row) => {
      if (err) {
        console.error("Error checking for manga data:", err);
        return reject(err);
      }
      
      if (row.count > 0) {
        console.log("Manga data already exists, skipping manga seed...");
      } else {
        console.log("Seeding manga data...");
        
        // Insert manga data
        const mangaStmt = db.prepare(`
          INSERT INTO manga_library (
            id, title, cover, description, author, chapters, status, genre, 
            tags, release_date, language
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        mangaData.forEach(manga => {
          mangaStmt.run(
            manga.id, manga.title, manga.cover, manga.description, manga.author,
            manga.chapters, manga.status, manga.genre, manga.tags, 
            manga.release_date, manga.language
          );
        });
        
        mangaStmt.finalize();
        console.log(`Added ${mangaData.length} manga items to the database.`);
      }
      
      // Check for existing book data
      db.get("SELECT COUNT(*) as count FROM book_library", (err, row) => {
        if (err) {
          console.error("Error checking for book data:", err);
          return reject(err);
        }
        
        if (row.count > 0) {
          console.log("Book data already exists, skipping book seed...");
        } else {
          console.log("Seeding book data...");
          
          // Insert book data
          const bookStmt = db.prepare(`
            INSERT INTO book_library (
              id, title, cover, description, author, pages, isbn, publisher, format,
              genre, tags, release_date, language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          bookData.forEach(book => {
            bookStmt.run(
              book.id, book.title, book.cover, book.description, book.author,
              book.pages, book.isbn, book.publisher, book.format, book.genre,
              book.tags, book.release_date, book.language
            );
          });
          
          bookStmt.finalize();
          console.log(`Added ${bookData.length} book items to the database.`);
        }
        
        // Check for existing news data
        db.get("SELECT COUNT(*) as count FROM news_library", (err, row) => {
          if (err) {
            console.error("Error checking for news data:", err);
            return reject(err);
          }
          
          if (row.count > 0) {
            console.log("News data already exists, skipping news seed...");
          } else {
            console.log("Seeding news data...");
            
            // Insert news data
            const newsStmt = db.prepare(`
              INSERT INTO news_library (
                id, title, image, summary, content, author, date, source, source_url,
                category, is_highlighted, tags, language
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            newsData.forEach(news => {
              newsStmt.run(
                news.id, news.title, news.image, news.summary, news.content, news.author,
                news.date, news.source, news.source_url, news.category, news.is_highlighted,
                news.tags, news.language
              );
            });
            
            newsStmt.finalize();
            console.log(`Added ${newsData.length} news items to the database.`);
          }
          
          resolve();
        });
      });
    });
  });
};

// Main function
async function main() {
  try {
    await createTables();
    await insertData();
    console.log("Library data seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding library data:", error);
  } finally {
    db.close();
  }
}

main();