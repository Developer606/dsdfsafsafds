import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/bookmark-button";
import { NotificationHeader } from "../components/notification-header";
import { ArrowLeft, Book, Bookmark, Newspaper, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define interfaces for the bookmarks
interface BookmarkItem {
  id: number;
  userId: number;
  contentType: 'manga' | 'book' | 'news';
  contentId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export default function BookmarksPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'manga' | 'book' | 'news'>('all');
  const [, setLocation] = useLocation();
  
  // Fetch all bookmarks
  const { data: allBookmarks, isLoading, error } = useQuery({
    queryKey: ['/api/bookmarks'],
    queryFn: async () => {
      const response = await fetch('/api/bookmarks');
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if not authenticated
          toast({
            title: "Authentication Required",
            description: "Please log in to view your bookmarks.",
            variant: "destructive"
          });
          setLocation("/");
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch bookmarks");
      }
      return response.json() as Promise<BookmarkItem[]>;
    }
  });
  
  // Filter bookmarks based on active tab
  const displayedBookmarks = allBookmarks?.filter(bookmark => 
    activeTab === 'all' || bookmark.contentType === activeTab
  );
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-slate-900">
      <NotificationHeader />
      
      <div className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => setLocation("/library")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
        </Button>
        
        <div className="mb-8 flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-purple-800 dark:text-purple-300"
            >
              My Bookmarks
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 dark:text-gray-400"
            >
              Your saved manga, books and news articles
            </motion.p>
          </div>
        </div>
        
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg border border-purple-100 dark:border-purple-900 p-6">
          <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as any)} value={activeTab}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <TabsList className="bg-transparent w-full justify-start space-x-6 -mb-px">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  All Bookmarks
                </TabsTrigger>
                <TabsTrigger 
                  value="manga" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <Book className="h-4 w-4 mr-2" />
                  Manga
                </TabsTrigger>
                <TabsTrigger 
                  value="book" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <Book className="h-4 w-4 mr-2" />
                  Books
                </TabsTrigger>
                <TabsTrigger 
                  value="news" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 pb-3 px-1"
                >
                  <Newspaper className="h-4 w-4 mr-2" />
                  News
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="focus-visible:outline-none focus-visible:ring-0">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-w-16 aspect-h-9">
                        <Skeleton className="h-full w-full" />
                      </div>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center p-8">
                  <p className="text-red-500 dark:text-red-400 mb-4">
                    Failed to load bookmarks. Please try again.
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : displayedBookmarks?.length === 0 ? (
                <div className="text-center p-12">
                  <Bookmark className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                  <h3 className="text-xl font-semibold mb-2">No bookmarks found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {activeTab === 'all' 
                      ? "You haven't bookmarked any content yet." 
                      : `You haven't bookmarked any ${activeTab} content yet.`}
                  </p>
                  <Button onClick={() => setLocation("/library")}>
                    Browse Library
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedBookmarks?.map((bookmark) => (
                    <motion.div
                      key={bookmark.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="h-full flex flex-col overflow-hidden transform transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                        {bookmark.thumbnailUrl ? (
                          <div 
                            className="h-48 bg-cover bg-center"
                            style={{ backgroundImage: `url(${bookmark.thumbnailUrl})` }}
                          />
                        ) : (
                          <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                            {bookmark.contentType === 'manga' && (
                              <Book className="h-16 w-16 text-white" />
                            )}
                            {bookmark.contentType === 'book' && (
                              <Book className="h-16 w-16 text-white" />
                            )}
                            {bookmark.contentType === 'news' && (
                              <Newspaper className="h-16 w-16 text-white" />
                            )}
                          </div>
                        )}
                        
                        <CardHeader>
                          <Badge className="w-fit mb-2 text-xs" variant={
                            bookmark.contentType === 'manga' ? 'secondary' :
                            bookmark.contentType === 'book' ? 'default' : 'outline'
                          }>
                            {bookmark.contentType.charAt(0).toUpperCase() + bookmark.contentType.slice(1)}
                          </Badge>
                          <CardTitle className="text-lg">{bookmark.title}</CardTitle>
                          <CardDescription>
                            Saved on {new Date(bookmark.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex-grow">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                            {bookmark.description || 'No description available.'}
                          </p>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between">
                          <Button
                            variant="default" 
                            onClick={() => {
                              // Simulate 'Read Now' behavior
                              // In a real app, this would navigate to the content
                              toast({
                                title: "Reading Content",
                                description: `Opening ${bookmark.title}`,
                              });
                            }}
                          >
                            Read Now
                          </Button>
                          
                          <BookmarkButton
                            contentType={bookmark.contentType}
                            contentId={bookmark.contentId}
                            title={bookmark.title}
                            description={bookmark.description}
                            thumbnailUrl={bookmark.thumbnailUrl}
                          />
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}