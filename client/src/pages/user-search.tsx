import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Search, User as UserIcon, ArrowLeft, MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

// Define the user interface based on the API response
interface UserSearchResult {
  id: number;
  username: string;
  fullName: string;
  profileCompleted: boolean;
  lastLoginAt: string | null;
}

export default function UserSearch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch search results
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) return [];
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (!response.ok) {
          throw new Error("Failed to search users");
        }
        const data = await response.json();
        return data as UserSearchResult[];
      } catch (error) {
        console.error("Error searching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to search for users. Please try again.",
        });
        return [];
      }
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const goBack = () => {
    setLocation("/home");
  };

  // Calculate initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Format the last login date
  const formatLastSeen = (dateString: string | null): string => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return diffMins <= 1 ? "Just now" : `${diffMins} mins ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 p-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={goBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-white">Find Users</h1>
        </div>
        
        {/* Search input */}
        <div className="mt-4 relative">
          <Input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-6 rounded-full bg-white/10 backdrop-blur-sm text-white placeholder:text-white/70 border-none focus-visible:ring-white/30"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
        </div>
      </div>
      
      {/* Search results */}
      <div className="p-4">
        {debouncedQuery.trim().length < 2 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <Search className="mx-auto h-12 w-12 mb-3 opacity-20" />
            <p className="text-lg">Enter at least 2 characters to search</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <UserIcon className="mx-auto h-12 w-12 mb-3 opacity-20" />
            <p className="text-lg">No users found</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 mt-2"
            >
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex items-center p-4">
                        <Avatar className="h-12 w-12 mr-4 bg-gradient-to-br from-pink-400 to-purple-500">
                          <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{user.fullName || user.username}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                          {user.lastLoginAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Last seen: {formatLastSeen(user.lastLoginAt)}
                            </p>
                          )}
                        </div>
                        <Link href={`/messages/${user.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Mobile navigation bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around">
          <Link href="/home" className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <div className="flex flex-col items-center justify-center text-pink-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="text-xs mt-1">Search</span>
          </div>
          <Link href="/create" className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span className="text-xs mt-1">Create</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
}