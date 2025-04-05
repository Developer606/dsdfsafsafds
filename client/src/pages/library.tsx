import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { NotificationHeader } from "../components/notification-header";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  
  // Simulate fetching data from API
  const mangaQuery = useQuery({
    queryKey: ['/api/library/manga'],
    enabled: activeTab === "manga",
    // This placeholder would normally fetch from an API
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return dummyManga;
    }
  });
  
  const booksQuery = useQuery({
    queryKey: ['/api/library/books'],
    enabled: activeTab === "books",
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return dummyBooks;
    }
  });
  
  const newsQuery = useQuery({
    queryKey: ['/api/library/news'],
    enabled: activeTab === "news",
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
                              <Badge key={tag} variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            onClick={() => handleReadMore(book.id, "book")}
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
            
            {/* News Tab Content */}
            <TabsContent value="news" className="focus:outline-none">
              <div className="space-y-6">
                {newsQuery.isLoading ? (
                  // Skeleton loaders while fetching
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="md:flex">
                        <Skeleton className="w-full md:w-64 h-48" />
                        <div className="p-4 flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-16 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                          <Skeleton className="h-9 w-32" />
                        </div>
                      </div>
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
                      <Card className="overflow-hidden border border-purple-100 dark:border-purple-900 transition-all hover:shadow-md dark:hover:shadow-purple-900/20">
                        <div className="md:flex">
                          <div className="md:w-64 h-48 overflow-hidden">
                            <img 
                              src={news.image} 
                              alt={news.title}
                              className="w-full h-full object-cover transition-transform hover:scale-105"
                            />
                          </div>
                          <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">{news.title}</h3>
                              <span className="text-xs text-gray-500">{news.date}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              {news.source} • by {news.author}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 my-3">
                              {news.summary}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {news.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <Button 
                              onClick={() => handleReadMore(news.id, "news article")}
                              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                            >
                              Read Full Article
                            </Button>
                          </div>
                        </div>
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