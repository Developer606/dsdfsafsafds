/**
 * Seed script to populate the library database with initial data.
 * This will write the frontend dummy data to the SQLite database.
 */
import { libraryDb, initializeLibraryDatabase } from './server/library-db.js';
import { mangaLibrary, bookLibrary, newsLibrary } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Manga data
const mangaData = [
  {
    id: "one-piece",
    title: "One Piece",
    cover:
      "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-oT7YguhEK1TE.jpg",
    description:
      "Gol D. Roger, a man referred to as the 'Pirate King,' is set to be executed by the World Government. But just before his death, he confirms the existence of a great treasure, One Piece, located somewhere within the vast ocean known as the Grand Line.",
    author: "Eiichiro Oda",
    chapters: 1037,
    status: "ongoing",
    genre: "Adventure",
    tags: JSON.stringify(["Adventure", "Fantasy", "Action"]),
    releaseDate: "1997-07-22",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "attack-on-titan",
    title: "Attack on Titan",
    cover:
      "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx53390-1RsuABC34p9u.jpg",
    description:
      "Several hundred years ago, humans were nearly exterminated by giants. Giants are typically several stories tall, seem to have no intelligence, and devour human beings.",
    author: "Hajime Isayama",
    chapters: 139,
    status: "completed",
    genre: "Action",
    tags: JSON.stringify(["Action", "Drama", "Horror"]),
    releaseDate: "2009-09-09",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer",
    cover:
      "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx87216-c9bSNVD10UuD.png",
    description:
      "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself.",
    author: "Koyoharu Gotouge",
    chapters: 205,
    status: "completed",
    genre: "Action",
    tags: JSON.stringify(["Action", "Supernatural", "Historical"]),
    releaseDate: "2016-02-15",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

// Book data
const bookData = [
  {
    id: "brave-new-world",
    title: "Brave New World",
    cover:
      "https://images-na.ssl-images-amazon.com/images/I/41le8ej-fiL._SX325_BO1,204,203,200_.jpg",
    description:
      "Set in a dystopian future, the novel anticipates developments in reproductive technology, sleep-learning, psychological manipulation, and classical conditioning that combine to change society.",
    author: "Aldous Huxley",
    pages: 288,
    isbn: "9780060850524",
    publisher: "Harper Perennial",
    format: "paperback",
    genre: "Science Fiction",
    tags: JSON.stringify(["Science Fiction", "Dystopian", "Classic"]),
    releaseDate: "1932-01-01",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "1984",
    title: "1984",
    cover:
      "https://images-na.ssl-images-amazon.com/images/I/41aM4xOZxaL._SX277_BO1,204,203,200_.jpg",
    description:
      "The novel is set in Airstrip One, a province of the superstate Oceania in a world of perpetual war, omnipresent government surveillance, and public manipulation.",
    author: "George Orwell",
    pages: 328,
    isbn: "9780451524935",
    publisher: "Signet Classic",
    format: "paperback",
    genre: "Dystopian",
    tags: JSON.stringify(["Dystopian", "Political", "Classic"]),
    releaseDate: "1949-06-08",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "harry-potter",
    title: "Harry Potter and the Philosopher's Stone",
    cover:
      "https://images-na.ssl-images-amazon.com/images/I/51UoqRAxwEL._SX331_BO1,204,203,200_.jpg",
    description:
      "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive.",
    author: "J.K. Rowling",
    pages: 320,
    isbn: "9781408855652",
    publisher: "Bloomsbury",
    format: "hardcover",
    genre: "Fantasy",
    tags: JSON.stringify(["Fantasy", "Magic", "Adventure"]),
    releaseDate: "1997-06-26",
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

// News data
const newsData = [
  {
    id: "anime-expo-2025",
    title: "Anime Expo 2025 Announces Major Studio Appearances",
    image: "https://images.unsplash.com/photo-1518051870910-a46e30d9db16",
    summary:
      "Anime Expo organizers have announced an impressive lineup of Japanese animation studios that will be attending next year's event, including MAPPA, Ufotable, and Kyoto Animation.",
    content: "Anime Expo, North America's largest celebration of Japanese pop culture, has announced that MAPPA, Ufotable, and Kyoto Animation will all have major presentations at the 2025 event. Each studio is expected to bring exclusive announcements and previews of upcoming projects. This marks the first time all three prestigious animation houses will be present at the same Anime Expo, promising an unprecedented opportunity for fans to engage with the creative forces behind some of the most popular anime series of recent years.",
    author: "Anime News Network",
    date: "2025-03-15",
    source: "AnimeNewsNetwork",
    sourceUrl: "https://www.animenewsnetwork.com",
    category: "Event",
    isHighlighted: 1,
    tags: JSON.stringify(["Event", "Industry", "Convention"]),
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "manga-sales-2025",
    title: "Manga Sales Continue to Break Records in Global Markets",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d",
    summary:
      "Sales figures for the first quarter of 2025 show manga continuing to outsell traditional comics in North America and Europe by significant margins, with digital sales growing fastest among younger readers.",
    content: "According to industry analysts, manga sales have continued their upward trajectory in global markets throughout the first quarter of 2025. In North America alone, manga revenue surpassed $450 million, representing a 15% increase compared to the same period last year. Europe has seen similar growth, with countries like France, Italy, and Germany reporting record-breaking sales. Digital manga platforms have experienced the most dramatic surge, with a 28% year-over-year increase, particularly among readers aged 16-24. Publishers are expanding their digital offerings in response to this trend, with several major publishing houses announcing enhanced mobile reading applications with multilingual support.",
    author: "Japan Times",
    date: "2025-04-02",
    source: "JapanTimes",
    sourceUrl: "https://www.japantimes.co.jp",
    category: "Industry",
    isHighlighted: 0,
    tags: JSON.stringify(["Industry", "Sales", "Global"]),
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "anime-streaming-platform",
    title: "New AI-Enhanced Anime Streaming Platform Launches Next Month",
    image: "https://images.unsplash.com/photo-1601513445506-2ae0d022d6e9",
    summary:
      "A revolutionary new streaming service dedicated to anime will launch next month featuring AI-enhanced upscaling of classic anime series and personalized recommendations based on viewing habits.",
    content: "AnimeVerse, a new streaming platform specifically designed for anime enthusiasts, is set to launch next month with several technological innovations. The service will feature AI-enhanced upscaling of classic anime series, bringing decades-old shows into high definition without the artifacts common in traditional upscaling methods. Additionally, the platform will utilize advanced machine learning algorithms to provide highly personalized recommendations based on viewing habits, mood analysis, and even time of day. The subscription service has already secured licensing deals with major studios including Toei Animation, Sunrise, and Production I.G, promising a vast library of both classic and current series. Early access sign-ups begin next week with a promotional discount for founding members.",
    author: "Tech Anime Journal",
    date: "2025-03-28",
    source: "TechAnimeJournal",
    sourceUrl: "https://www.techanimejournal.com",
    category: "Technology",
    isHighlighted: 1,
    tags: JSON.stringify(["Technology", "Streaming", "AI"]),
    language: "english",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

async function seedLibraryData() {
  try {
    console.log("Initializing library database...");
    await initializeLibraryDatabase();
    
    console.log("Checking for existing data...");
    const existingManga = await libraryDb.select().from(mangaLibrary);
    const existingBooks = await libraryDb.select().from(bookLibrary);
    const existingNews = await libraryDb.select().from(newsLibrary);
    
    if (existingManga.length > 0) {
      console.log("Manga data already exists, skipping manga seed...");
    } else {
      console.log("Seeding manga data...");
      for (const manga of mangaData) {
        await libraryDb.insert(mangaLibrary).values(manga);
      }
      console.log(`Added ${mangaData.length} manga items to the database.`);
    }
    
    if (existingBooks.length > 0) {
      console.log("Book data already exists, skipping books seed...");
    } else {
      console.log("Seeding book data...");
      for (const book of bookData) {
        await libraryDb.insert(bookLibrary).values(book);
      }
      console.log(`Added ${bookData.length} book items to the database.`);
    }
    
    if (existingNews.length > 0) {
      console.log("News data already exists, skipping news seed...");
    } else {
      console.log("Seeding news data...");
      for (const news of newsData) {
        await libraryDb.insert(newsLibrary).values(news);
      }
      console.log(`Added ${newsData.length} news items to the database.`);
    }
    
    console.log("Library data seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding library data:", error);
  }
}

// Run the seed function
seedLibraryData();