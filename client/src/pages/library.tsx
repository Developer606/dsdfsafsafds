import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { NotificationHeader } from "../components/notification-header";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  content_url?: string;
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
  content_url?: string;
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
  content_url?: string;
}

// Data now comes from the API endpoints instead of placeholder data

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
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Fetch manga data from the API
  const mangaQuery = useQuery({
    queryKey: ["/api/library/manga", searchQuery],
    enabled: activeTab === "manga",
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/library/manga?q=${encodeURIComponent(searchQuery)}`
        : "/api/library/manga";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch manga data");
      }
      return await response.json();
    },
  });

  // Fetch books data from the API
  const booksQuery = useQuery({
    queryKey: ["/api/library/books", searchQuery],
    enabled: activeTab === "books",
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/library/books?q=${encodeURIComponent(searchQuery)}`
        : "/api/library/books";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch books data");
      }
      return await response.json();
    },
  });

  // Fetch news data from the API
  const newsQuery = useQuery({
    queryKey: ["/api/library/news", searchQuery],
    enabled: activeTab === "news",
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/library/news?q=${encodeURIComponent(searchQuery)}`
        : "/api/library/news";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch news data");
      }
      return await response.json();
    },
  });

  const handleReadMore = (id: string, type: string, contentUrl?: string) => {
    if (contentUrl) {
      // If content URL is provided, navigate to it
      window.open(contentUrl, '_blank');
    } else {
      // Otherwise show toast message
      toast({
        title: "Coming Soon",
        description: `Reading ${type} content will be available in a future update!`,
        variant: "default",
      });
    }
  };

  // Modern Android Material Design 3 mobile UI
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col h-screen">
        {/* Ultra compact Android Material Design 3 App Bar with minimum height */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white flex-shrink-0 z-10 md3-elevation-2">
          {/* Status bar simulation - minimal height */}
          <div className="h-2 bg-black/10 w-full"></div>

          {isSearching ? (
            <div className="flex items-center py-0.5 px-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="p-1 rounded-full mr-1 material-ripple flex items-center justify-center"
              >
                <ArrowLeft size={16} />
              </motion.button>
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center overflow-hidden">
                <Search size={12} className="ml-2 text-white/70" />
                <input
                  type="text"
                  placeholder="Search library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent py-1 px-2 focus:outline-none placeholder-white/60 text-white text-xs"
                  autoFocus
                />
                {searchQuery && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-full material-ripple flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </motion.button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-0.5 px-1.5">
              <div className="flex items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLocation("/chats")}
                  className="p-1 -ml-0.5 rounded-full material-ripple flex items-center justify-center"
                >
                  <ArrowLeft size={16} />
                </motion.button>
                <h1 className="text-sm font-medium tracking-tight ml-0.5">
                  Library
                </h1>
              </div>
              <div className="flex items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSearching(true)}
                  className="p-1 rounded-full material-ripple flex items-center justify-center"
                >
                  <Search size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded-full material-ripple flex items-center justify-center ml-0.5"
                >
                  <Menu size={14} />
                </motion.button>
              </div>
            </div>
          )}

          {/* Ultra compact Material Design 3 Tabs with minimal height */}
          <div className="flex border-b border-white/20">
            {["manga", "books", "news"].map((tab) => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1 px-1 flex flex-col items-center material-ripple relative`}
              >
                {tab === "manga" && <Book size={14} className="mb-0" />}
                {tab === "books" && (
                  <svg
                    className="w-3.5 h-3.5 mb-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 0M3 12l3 0M3 18l3 0"
                    />
                  </svg>
                )}
                {tab === "news" && <Newspaper size={14} className="mb-0" />}
                <span className="text-[8px] font-medium">
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>

                {/* Animated indicator */}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Content Area - Android Material Design 3 scrolling with fixed header */}
        <div className="flex-1 overflow-auto overscroll-contain android-scrollbar">
          {activeTab === "manga" && (
            <div className="p-3 pb-16">
              {mangaQuery.isLoading ? (
                // Material Design 3 skeleton loaders
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      >
                        <Skeleton className="w-full h-44 rounded-t-2xl" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-6 w-3/4 rounded-full" />
                          <Skeleton className="h-4 w-1/2 rounded-full" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <div className="flex justify-between space-x-2 pt-2">
                            <Skeleton className="h-10 w-4/5 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                          </div>
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
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium material-ripple"
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
                      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="relative">
                        <img
                          src={manga.cover}
                          alt={manga.title}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/0"></div>
                        <div className="absolute top-3 right-3">
                          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {manga.chapters} chapters
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg">
                            {manga.title}
                          </h3>
                          <div className="flex items-center text-white/90 text-xs mt-1">
                            <span className="font-medium">{manga.author}</span>
                            <span className="mx-1">•</span>
                            <span>{manga.releaseDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                          {manga.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {manga.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReadMore(manga.id, "manga", manga.content_url)}
                            className="flex-1 py-2.5 bg-purple-600 text-white rounded-full text-sm font-medium flex items-center justify-center material-ripple"
                          >
                            Read Now
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="p-2.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center material-ripple"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "books" && (
            <div className="p-3 pb-16">
              {booksQuery.isLoading ? (
                // Material Design 3 skeleton loaders
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      >
                        <Skeleton className="w-full h-44 rounded-t-2xl" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-6 w-3/4 rounded-full" />
                          <Skeleton className="h-4 w-1/2 rounded-full" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <div className="flex justify-between space-x-2 pt-2">
                            <Skeleton className="h-10 w-4/5 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                          </div>
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
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium material-ripple"
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
                      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="relative">
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/0"></div>
                        <div className="absolute top-3 right-3">
                          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {book.pages} pages
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg">
                            {book.title}
                          </h3>
                          <div className="flex items-center text-white/90 text-xs mt-1">
                            <span className="font-medium">{book.author}</span>
                            <span className="mx-1">•</span>
                            <span>{book.releaseDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                          {book.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {book.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReadMore(book.id, "book", book.content_url)}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-full text-sm font-medium flex items-center justify-center material-ripple"
                          >
                            Read Now
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="p-2.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center material-ripple"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "news" && (
            <div className="p-3 pb-16">
              {newsQuery.isLoading ? (
                // Material Design 3 skeleton loaders
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      >
                        <Skeleton className="w-full h-40 rounded-t-2xl" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-6 w-3/4 rounded-full" />
                          <Skeleton className="h-4 w-1/2 rounded-full" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <div className="flex justify-between space-x-2 pt-2">
                            <Skeleton className="h-10 w-4/5 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                          </div>
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
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium material-ripple"
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
                      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md3-elevation-1 border border-gray-100 dark:border-gray-700"
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="relative">
                        <img
                          src={news.image}
                          alt={news.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/0"></div>
                        <div className="absolute top-3 right-3">
                          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {news.source}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg line-clamp-2">
                            {news.title}
                          </h3>
                          <div className="flex items-center text-white/90 text-xs mt-1">
                            <span className="font-medium">{news.author}</span>
                            <span className="mx-1">•</span>
                            <span>{news.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
                          {news.summary}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {news.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              handleReadMore(news.id, "news article", news.content_url)
                            }
                            className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-full text-sm font-medium flex items-center justify-center material-ripple"
                          >
                            Read Full Article
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="p-2.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center material-ripple"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"></path>
                            </svg>
                          </motion.button>
                        </div>
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
          <Tabs
            defaultValue="manga"
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <TabsList className="bg-transparent w-full justify-start space-x-6 -mb-px">
                <TabsTrigger
                  value="manga"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Manga
                </TabsTrigger>
                <TabsTrigger
                  value="books"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 0M3 12l3 0M3 18l3 0"
                    />
                  </svg>
                  Books
                </TabsTrigger>
                <TabsTrigger
                  value="news"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  News
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Manga Tab Content */}
            <TabsContent value="manga" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mangaQuery.isLoading
                  ? // Skeleton loaders while fetching
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
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
                  : mangaQuery.data?.map((manga) => (
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
                              <span className="text-white text-sm">
                                Chapters: {manga.chapters}
                              </span>
                            </div>
                          </div>
                          <CardHeader>
                            <CardTitle className="text-xl text-purple-800 dark:text-purple-300">
                              {manga.title}
                            </CardTitle>
                            <CardDescription>
                              by {manga.author} •{" "}
                              {new Date(manga.releaseDate).getFullYear()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                              {manga.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {manga.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              onClick={() => handleReadMore(manga.id, "manga", manga.content_url)}
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            >
                              Read Now
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
              </div>
            </TabsContent>

            {/* Books Tab Content */}
            <TabsContent value="books" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {booksQuery.isLoading
                  ? // Skeleton loaders while fetching
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
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
                  : booksQuery.data?.map((book) => (
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
                              <span className="text-white text-sm">
                                Pages: {book.pages}
                              </span>
                            </div>
                          </div>
                          <CardHeader>
                            <CardTitle className="text-xl text-purple-800 dark:text-purple-300">
                              {book.title}
                            </CardTitle>
                            <CardDescription>
                              by {book.author} •{" "}
                              {new Date(book.releaseDate).getFullYear()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                              {book.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {book.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              onClick={() => handleReadMore(book.id, "book", book.content_url)}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                            >
                              Read Now
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
              </div>
            </TabsContent>

            {/* News Tab Content */}
            <TabsContent value="news" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsQuery.isLoading
                  ? // Skeleton loaders while fetching
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
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
                  : newsQuery.data?.map((news) => (
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
                            <CardTitle className="text-xl text-purple-800 dark:text-purple-300">
                              {news.title}
                            </CardTitle>
                            <CardDescription>
                              {news.author} •{" "}
                              {new Date(news.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                              {news.summary}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {news.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              onClick={() =>
                                handleReadMore(news.id, "news article", news.content_url)
                              }
                              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                            >
                              Read Full Article
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
