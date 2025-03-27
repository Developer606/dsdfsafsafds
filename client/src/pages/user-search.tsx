import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Search, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  fullName?: string;
  profileCompleted?: boolean;
  lastLoginAt?: string;
}

export default function UserSearch() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Query to search users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error("Failed to search users");
        return await response.json();
      } catch (error) {
        console.error("Error searching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to search users",
        });
        return [];
      }
    },
    enabled: searchQuery.length >= 2,
  });
  
  const startConversation = (userId: number) => {
    setLocation(`/messages/${userId}`);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-[#008069] dark:bg-[#1F2C34] p-3 flex items-center shadow-md">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/conversations")}
          className="mr-2 text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-lg font-bold text-white">Find Users</h1>
      </div>
      
      {/* Search bar */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-5 rounded-full bg-white dark:bg-gray-700"
          />
        </div>
      </div>
      
      {/* Search results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008069]"></div>
          </div>
        ) : searchQuery.length < 2 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Enter at least 2 characters to search</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <UserPlus className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No users found for "{searchQuery}"</p>
          </div>
        ) : (
          <div>
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                onClick={() => startConversation(user.id)}
                className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarFallback className="bg-[#00A884] text-white">
                    {getInitials(user.fullName || user.username)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="font-medium">
                    {user.fullName || user.username}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-[#00A884] hover:bg-[#00A884]/10"
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
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}