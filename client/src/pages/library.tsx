import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Book,
  BookOpen,
  ChevronRight,
  Clock,
  Layout,
  Newspaper,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeProvider } from "@/lib/theme-context";

// Define types for media items
interface BaseMediaItem {
  id: string;
  title: string;
  cover?: string;
  image?: string;
}

interface BookMediaItem extends BaseMediaItem {
  author: string;
  description: string;
  rating: number;
}

interface NewsMediaItem extends BaseMediaItem {
  date: string;
  summary: string;
  source: string;
}

// Sample data for manga, books, and news
// In a real application, this would come from API calls
const sampleManga: BookMediaItem[] = [
  {
    id: "1",
    title: "Naruto",
    author: "Masashi Kishimoto",
    cover: "https://m.media-amazon.com/images/I/81qb4I6rbsL._AC_UF1000,1000_QL80_.jpg",
    description: "The story of a young ninja who seeks to become the leader of his village",
    rating: 4.8,
  },
  {
    id: "2", 
    title: "One Piece",
    author: "Eiichiro Oda",
    cover: "https://m.media-amazon.com/images/I/81s8xJUzWGL._AC_UF1000,1000_QL80_.jpg",
    description: "The adventures of Monkey D. Luffy and his crew in search of the greatest treasure",
    rating: 4.9,
  },
  {
    id: "3",
    title: "Attack on Titan",
    author: "Hajime Isayama",
    cover: "https://m.media-amazon.com/images/I/91M9VaZWxOL._AC_UF1000,1000_QL80_.jpg",
    description: "A world where humanity lives within cities surrounded by enormous walls that protect them from gigantic humanoid Titans",
    rating: 4.7,
  },
  {
    id: "4",
    title: "My Hero Academia",
    author: "Kōhei Horikoshi",
    cover: "https://m.media-amazon.com/images/I/71zgOtYOI2L._AC_UF1000,1000_QL80_.jpg",
    description: "A world where people with superpowers known as 'Quirks' are the norm",
    rating: 4.6,
  },
];

const sampleBooks: BookMediaItem[] = [
  {
    id: "1",
    title: "The Alchemist",
    author: "Paulo Coelho",
    cover: "https://m.media-amazon.com/images/I/71nXxCQukRL._AC_UF1000,1000_QL80_.jpg",
    description: "A story about following your dreams and listening to your heart",
    rating: 4.7,
  },
  {
    id: "2",
    title: "Dune",
    author: "Frank Herbert",
    cover: "https://m.media-amazon.com/images/I/91DUhtU6KGL._AC_UF1000,1000_QL80_.jpg",
    description: "A science fiction novel that explores politics, religion, and ecology",
    rating: 4.8,
  },
  {
    id: "3",
    title: "1984",
    author: "George Orwell",
    cover: "https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg",
    description: "A dystopian novel about totalitarianism, surveillance, and censorship",
    rating: 4.6,
  },
  {
    id: "4",
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    cover: "https://m.media-amazon.com/images/I/71jLBXtWJWL._AC_UF1000,1000_QL80_.jpg",
    description: "An epic high-fantasy novel about a quest to destroy an all-powerful ring",
    rating: 4.9,
  },
];

const sampleNews: NewsMediaItem[] = [
  {
    id: "1",
    title: "New Anime Adaptations Announced for 2025",
    date: "April 5, 2025",
    image: "https://www.hollywoodreporter.com/wp-content/uploads/2022/10/One-Piece-Film-Red-Publicity-Still-2-H-2022.jpg",
    summary: "Major studios announce plans for new anime adaptations of popular manga series",
    source: "Anime News Network",
  },
  {
    id: "2",
    title: "Manga Sales Break Records Worldwide",
    date: "April 3, 2025",
    image: "https://images.squarespace-cdn.com/content/v1/54fc8146e4b02a22841f4df7/1628526458891-Z9NO2VMVS9ME2SVS6UDC/image-asset.jpeg",
    summary: "Global manga sales reach unprecedented levels as digital platforms expand reach",
    source: "Comics Journal",
  },
  {
    id: "3",
    title: "Digital Reading Transforms Publishing Industry",
    date: "April 1, 2025",
    image: "https://www.ingramspark.com/hubfs/Blog-Images/indi-self-publishing-sites.jpg",
    summary: "Experts discuss how digital reading platforms are changing the publishing landscape",
    source: "Literary Review",
  },
  {
    id: "4",
    title: "Top 10 Most Anticipated Book Releases of the Year",
    date: "March 30, 2025",
    image: "https://images.inc.com/uploaded_files/image/1920x1080/getty_655998316_2000149920009280218_363765.jpg",
    summary: "Critics and readers weigh in on the most exciting upcoming book releases",
    source: "Book Review Weekly",
  },
];

// Define types for media items
interface BaseMediaItem {
  id: string;
  title: string;
  cover?: string;
  image?: string;
}

interface BookMediaItem extends BaseMediaItem {
  author: string;
  description: string;
  rating: number;
}

interface NewsMediaItem extends BaseMediaItem {
  date: string;
  summary: string;
  source: string;
}

// Media Item Component
const MediaItem = ({ item, type }: { 
  item: BookMediaItem | NewsMediaItem; 
  type: 'manga' | 'book' | 'news' 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden shadow-md border border-gray-200/50 dark:border-gray-700/50 flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.cover || item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {(type === "manga" || type === "book") && 'rating' in item && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <Star className="h-3 w-3 mr-1 fill-white" /> {item.rating}
          </div>
        )}
        {type === "news" && 'date' in item && (
          <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <Clock className="h-3 w-3 mr-1" /> {item.date}
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1">{item.title}</h3>
        {(type === "manga" || type === "book") && 'author' in item ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">by {item.author}</p>
        ) : type === "news" && 'source' in item ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Source: {item.source}</p>
        ) : null}
        <p className="text-sm text-slate-700 dark:text-slate-400 mb-4 line-clamp-2">
          {('description' in item) ? item.description : ('summary' in item) ? item.summary : ''}
        </p>
        <div className="mt-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border-purple-200 dark:border-purple-900/50"
          >
            {type === "news" ? "Read Article" : "Read Now"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* Header */}
        <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button variant="ghost" className="font-semibold text-lg flex items-center gap-2">
                  <Layout className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
                    Anime Chat
                  </span>
                </Button>
              </Link>
              <div className="flex items-center space-x-4">
                <div className="relative w-64">
                  <Input
                    type="text"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:ring-purple-500 dark:focus:ring-purple-400"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
              Digital Library
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Explore our collection of manga, books, and news articles from the anime and literary world.
              Dive into stories that inspire your conversations with characters.
            </p>
          </motion.div>

          {/* Tabs for different content types */}
          <Tabs defaultValue="manga" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <TabsTrigger 
                value="manga" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-indigo-500/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Manga
              </TabsTrigger>
              <TabsTrigger 
                value="books"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
              >
                <Book className="h-4 w-4 mr-2" />
                Books
              </TabsTrigger>
              <TabsTrigger 
                value="news"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
              >
                <Newspaper className="h-4 w-4 mr-2" />
                News
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manga" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sampleManga.map((manga) => (
                  <MediaItem key={manga.id} item={manga} type="manga" />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="books" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sampleBooks.map((book) => (
                  <MediaItem key={book.id} item={book} type="book" />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="news" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sampleNews.map((news) => (
                  <MediaItem key={news.id} item={news} type="news" />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              <p>© 2025 Anime Chat Library. All content is for demonstration purposes only.</p>
              <p className="mt-2">Images and content are placeholders and would be replaced with real content from authorized sources.</p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}