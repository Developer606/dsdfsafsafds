import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { NotificationHeader } from "../components/notification-header";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Home, Book, Newspaper, Search, Menu } from "lucide-react";

// Define interfaces for the library content
interface MangaItem {
  id: string;
  title: string;
  cover: string;
  description: string;
  author: string;
  chapters: number;
  tags: string[];
  releaseDate: string;
}

interface BookItem {
  id: string;
  title: string;
  cover: string;
  description: string;
  author: string;
  pages: number;
  tags: string[];
  releaseDate: string;
}

interface NewsItem {
  id: string;
  title: string;
  image: string;
  summary: string;
  author: string;
  date: string;
  tags: string[];
  source: string;
}

// Placeholder data for the initial UI
const dummyManga: MangaItem[] = [
  {
    id: "one-piece",
    title: "One Piece",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-oT7YguhEK1TE.jpg",
    description: "Gol D. Roger, a man referred to as the 'Pirate King,' is set to be executed by the World Government. But just before his death, he confirms the existence of a great treasure, One Piece, located somewhere within the vast ocean known as the Grand Line.",
    author: "Eiichiro Oda",
    chapters: 1037,
    tags: ["Adventure", "Fantasy", "Action"],
    releaseDate: "1997-07-22"
  },
  {
    id: "attack-on-titan",
    title: "Attack on Titan",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx53390-1RsuABC34p9u.jpg",
    description: "Several hundred years ago, humans were nearly exterminated by giants. Giants are typically several stories tall, seem to have no intelligence, and devour human beings.",
    author: "Hajime Isayama",
    chapters: 139,
    tags: ["Action", "Drama", "Horror"],
    releaseDate: "2009-09-09"
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer",
    cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx87216-c9bSNVD10UuD.png",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself.",
    author: "Koyoharu Gotouge",
    chapters: 205,
    tags: ["Action", "Supernatural", "Historical"],
    releaseDate: "2016-02-15"
  }
];

const dummyBooks: BookItem[] = [
  {
    id: "brave-new-world",
    title: "Brave New World",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41le8ej-fiL._SX325_BO1,204,203,200_.jpg",
    description: "Set in a dystopian future, the novel anticipates developments in reproductive technology, sleep-learning, psychological manipulation, and classical conditioning that combine to change society.",
    author: "Aldous Huxley",
    pages: 288,
    tags: ["Science Fiction", "Dystopian", "Classic"],
    releaseDate: "1932-01-01"
  },
  {
    id: "1984",
    title: "1984",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41aM4xOZxaL._SX277_BO1,204,203,200_.jpg",
    description: "The novel is set in Airstrip One, a province of the superstate Oceania in a world of perpetual war, omnipresent government surveillance, and public manipulation.",
    author: "George Orwell",
    pages: 328,
    tags: ["Dystopian", "Political", "Classic"],
    releaseDate: "1949-06-08"
  },
  {
    id: "harry-potter",
    title: "Harry Potter and the Philosopher's Stone",
    cover: "https://images-na.ssl-images-amazon.com/images/I/51UoqRAxwEL._SX331_BO1,204,203,200_.jpg",
    description: "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive.",
    author: "J.K. Rowling",
    pages: 320,
    tags: ["Fantasy", "Magic", "Adventure"],
    releaseDate: "1997-06-26"
  }
];

const dummyNews: NewsItem[] = [
  {
    id: "anime-expo-2025",
    title: "Anime Expo 2025 Announces Major Studio Appearances",
    image: "https://images.unsplash.com/photo-1518051870910-a46e30d9db16",
    summary: "Anime Expo organizers have announced an impressive lineup of Japanese animation studios that will be attending next year's event, including MAPPA, Ufotable, and Kyoto Animation.",
    author: "Anime News Network",
    date: "2025-03-15",
    tags: ["Event", "Industry", "Convention"],
    source: "AnimeNewsNetwork"
  },
  {
    id: "manga-sales-2025",
    title: "Manga Sales Continue to Break Records in Global Markets",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d",
    summary: "Sales figures for the first quarter of 2025 show manga continuing to outsell traditional comics in North America and Europe by significant margins, with digital sales growing fastest among younger readers.",
    author: "Japan Times",
    date: "2025-04-02",
    tags: ["Industry", "Sales", "Global"],
    source: "JapanTimes"
  },
  {
    id: "anime-streaming-platform",
    title: "New AI-Enhanced Anime Streaming Platform Launches Next Month",
    image: "https://images.unsplash.com/photo-1601513445506-2ae0d022d6e9",
    summary: "A revolutionary new streaming service dedicated to anime will launch next month featuring AI-enhanced upscaling of classic anime series and personalized recommendations based on viewing habits.",
    author: "Tech Anime Journal",
    date: "2025-03-28",
    tags: ["Technology", "Streaming", "AI"],
    source: "TechAnimeJournal"
  }
];

// Main Library component
export default function Library() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("manga");
  const [isMobile, setIsMobile] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  
  // Check for mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Simulate fetching data from API
  const mangaQuery = useQuery({
    queryKey: ['/api/library/manga', searchQuery],
    enabled: activeTab === "manga",
    // This placeholder would normally fetch from an API
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (searchQuery) {
        return dummyManga.filter(manga => 
          manga.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          manga.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          manga.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return dummyManga;
    }
  });
  
  const booksQuery = useQuery({
    queryKey: ['/api/library/books', searchQuery],
    enabled: activeTab === "books",
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (searchQuery) {
        return dummyBooks.filter(book => 
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return dummyBooks;
    }
  });
  
  const newsQuery = useQuery({
    queryKey: ['/api/library/news', searchQuery],
    enabled: activeTab === "news",
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (searchQuery) {
        return dummyNews.filter(news => 
          news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          news.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          news.summary.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return dummyNews;
    }
  });

  const handleReadMore = (id: string, type: string) => {
    // This would normally navigate to a detailed view
    toast({
      title: "Coming Soon",
      description: `Reading ${type} content will be available in a future update!`,
      variant: "default",
    });
  };

  // Mobile Android-like design
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
        {/* Android-style App Bar with Material Design */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md">
          {isSearching ? (
            <div className="flex items-center p-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="p-2 rounded-full mr-2"
              >
                <ArrowLeft size={24} />
              </motion.button>
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-white/20 backdrop-blur-sm rounded-full py-2 px-4 focus:outline-none placeholder-white/60 text-white"
                autoFocus
              />
              {searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSearchQuery("")}
                  className="p-2 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </motion.button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation("/")}
                  className="mr-3"
                >
                  <ArrowLeft size={24} />
                </motion.button>
                <h1 className="text-xl font-medium">Library</h1>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSearching(true)}
                  className="p-2 rounded-full"
                >
                  <Search size={22} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full"
                >
                  <Menu size={22} />
                </motion.button>
              </div>
            </div>
          )}
          
          {/* Material Design Tabs */}
          <div className="flex">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("manga")}
              className={`flex-1 py-3 px-2 flex flex-col items-center ${activeTab === "manga" ? "border-b-2 border-white" : "opacity-70"}`}
            >
              <Book size={20} className="mb-1" />
              <span className="text-xs font-medium">Manga</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("books")}
              className={`flex-1 py-3 px-2 flex flex-col items-center ${activeTab === "books" ? "border-b-2 border-white" : "opacity-70"}`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 0M3 12l3 0M3 18l3 0" />
              </svg>
              <span className="text-xs font-medium">Books</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("news")}
              className={`flex-1 py-3 px-2 flex flex-col items-center ${activeTab === "news" ? "border-b-2 border-white" : "opacity-70"}`}
            >
              <Newspaper size={20} className="mb-1" />
              <span className="text-xs font-medium">News</span>
            </motion.button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === "manga" && (
            <div className="p-3">
              {mangaQuery.isLoading ? (
                // Android-style skeleton loaders
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                      <Skeleton className="w-full h-44" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mangaQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
                    <Search className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We couldn't find any manga matching your search.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium"
                  >
                    Clear search
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mangaQuery.data?.map((manga) => (
                    <motion.div
                      key={manga.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="relative">
                        <img 
                          src={manga.cover} 
                          alt={manga.title}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-white font-bold">{manga.title}</h3>
                          <div className="flex items-center text-white/80 text-xs">
                            <span>{manga.author}</span>
                            <span className="mx-1">•</span>
                            <span>{manga.chapters} chapters</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                          {manga.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {manga.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReadMore(manga.id, "manga")}
                          className="w-full py-2 bg-purple-600 text-white rounded-full text-sm font-medium flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Read Now
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === "books" && (
            <div className="p-3">
              {booksQuery.isLoading ? (
                // Android-style skeleton loaders
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                      <Skeleton className="w-full h-44" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : booksQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                    <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We couldn't find any books matching your search.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium"
                  >
                    Clear search
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {booksQuery.data?.map((book) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="relative">
                        <img 
                          src={book.cover} 
                          alt={book.title}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-white font-bold">{book.title}</h3>
                          <div className="flex items-center text-white/80 text-xs">
                            <span>{book.author}</span>
                            <span className="mx-1">•</span>
                            <span>{book.pages} pages</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                          {book.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {book.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReadMore(book.id, "book")}
                          className="w-full py-2 bg-blue-600 text-white rounded-full text-sm font-medium flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Read Now
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === "news" && (
            <div className="p-3">
              {newsQuery.isLoading ? (
                // Android-style skeleton loaders
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                      <Skeleton className="w-full h-36" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : newsQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                    <Search className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We couldn't find any news matching your search.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium"
                  >
                    Clear search
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsQuery.data?.map((news) => (
                    <motion.div
                      key={news.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="relative">
                        <img 
                          src={news.image} 
                          alt={news.title}
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute top-0 right-0 m-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                          {news.source}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-base font-bold line-clamp-1">{news.title}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{news.date}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
                          {news.summary}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {news.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReadMore(news.id, "news article")}
                          className="w-full py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-full text-sm font-medium flex items-center justify-center"
                        >
                          Read Full Article
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop UI remains the same
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-slate-900">
      <NotificationHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-purple-800 dark:text-purple-300 mb-2"
          >
            Library
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 dark:text-gray-400"
          >
            Discover manga, books, and the latest anime news
          </motion.p>
        </div>
        
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg border border-purple-100 dark:border-purple-900 p-6">
          <Tabs defaultValue="manga" onValueChange={setActiveTab} value={activeTab}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <TabsList className="bg-transparent w-full justify-start space-x-6 -mb-px">
                <TabsTrigger 
                  value="manga" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Manga
                </TabsTrigger>
                <TabsTrigger 
                  value="books" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 0M3 12l3 0M3 18l3 0" />
                  </svg>
                  Books
                </TabsTrigger>
                <TabsTrigger 
                  value="news" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  News
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Manga Tab Content */}
            <TabsContent value="manga" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mangaQuery.isLoading ? (
                  // Skeleton loaders while fetching
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="overflow-hidden h-[500px]">
                      <CardHeader className="p-0 pb-3">
                        <Skeleton className="w-full h-64" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  mangaQuery.data?.map((manga) => (
                    <motion.div
                      key={manga.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="overflow-hidden h-full border border-purple-100 dark:border-purple-900 transition-all hover:shadow-md dark:hover:shadow-purple-900/20">
                        <div className="relative h-64 overflow-hidden">
                          <img 
                            src={manga.cover} 
                            alt={manga.title}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <span className="text-white text-sm">Chapters: {manga.chapters}</span>
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-xl text-purple-800 dark:text-purple-300">{manga.title}</CardTitle>
                          <CardDescription>by {manga.author} • {new Date(manga.releaseDate).getFullYear()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                            {manga.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {manga.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            onClick={() => handleReadMore(manga.id, "manga")}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          >
                            Read Now
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
            
            {/* Books Tab Content */}
            <TabsContent value="books" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {booksQuery.isLoading ? (
                  // Skeleton loaders while fetching
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="overflow-hidden h-[500px]">
                      <CardHeader className="p-0 pb-3">
                        <Skeleton className="w-full h-64" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  booksQuery.data?.map((book) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="overflow-hidden h-full border border-purple-100 dark:border-purple-900 transition-all hover:shadow-md dark:hover:shadow-purple-900/20">
                        <div className="relative h-64 overflow-hidden">
                          <img 
                            src={book.cover} 
                            alt={book.title}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <span className="text-white text-sm">Pages: {book.pages}</span>
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-xl text-purple-800 dark:text-purple-300">{book.title}</CardTitle>
                          <CardDescription>by {book.author} • {new Date(book.releaseDate).getFullYear()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                            {book.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {book.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            onClick={() => handleReadMore(book.id, "book")}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                          >
                            Read Now
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
            
            {/* News Tab Content */}
            <TabsContent value="news" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsQuery.isLoading ? (
                  // Skeleton loaders while fetching
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="overflow-hidden h-[400px]">
                      <CardHeader className="p-0 pb-3">
                        <Skeleton className="w-full h-40" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  newsQuery.data?.map((news) => (
                    <motion.div
                      key={news.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="overflow-hidden h-full border border-purple-100 dark:border-purple-900 transition-all hover:shadow-md dark:hover:shadow-purple-900/20">
                        <div className="relative h-40 overflow-hidden">
                          <img 
                            src={news.image} 
                            alt={news.title}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                          />
                          <div className="absolute top-0 right-0 m-3">
                            <Badge className="bg-black/70 hover:bg-black/80 text-white border-transparent">
                              {news.source}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-xl text-purple-800 dark:text-purple-300">{news.title}</CardTitle>
                          <CardDescription>
                            {news.author} • {new Date(news.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                            {news.summary}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {news.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            onClick={() => handleReadMore(news.id, "news article")}
                            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                          >
                            Read Full Article
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}