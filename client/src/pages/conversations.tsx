import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { format, isToday, isYesterday } from "date-fns";

interface Conversation {
  id: number;
  otherUser: {
    id: number;
    username: string;
    fullName: string;
    lastLoginAt?: string;
  };
  lastMessage?: {
    content: string;
    timestamp: string;
    status: "sent" | "delivered" | "read";
  };
  unreadCount: number;
}

export default function Conversations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Query to fetch conversations
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/user-messages/conversations"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user-messages/conversations");
        if (!response.ok) throw new Error("Failed to fetch conversations");
        return await response.json();
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load conversations",
        });
        return [];
      }
    },
  });
  
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd/MM/yyyy");
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  const getStatusIcon = (status: "sent" | "delivered" | "read") => {
    if (status === "sent") {
      return (
        <svg width="16" height="15" className="text-gray-400">
          <path
            d="M1.5 7.5L5.5 11.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    } else if (status === "delivered") {
      return (
        <svg width="16" height="15" className="text-gray-400">
          <path
            d="M1.5 7.5L5.5 11.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M1.5 7.5L5.5 11.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-4 4)"
          />
        </svg>
      );
    } else {
      return (
        <svg width="16" height="15" className="text-blue-500">
          <path
            d="M1.5 7.5L5.5 11.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M1.5 7.5L5.5 11.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-4 4)"
          />
        </svg>
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-[#008069] dark:bg-[#1F2C34] p-3 flex items-center shadow-md">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/chats")}
          className="mr-2 text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-lg font-bold text-white flex-1">Chats</h1>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/users/search")}
          className="text-white hover:bg-white/20"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Search bar */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="text"
            placeholder="Search or start new chat"
            className="pl-10 py-5 rounded-full bg-white dark:bg-gray-700"
          />
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008069]"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/users/search")}
              className="mt-4 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Start new chat
            </Button>
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                onClick={() => setLocation(`/messages/${conversation.otherUser.id}`)}
                className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarFallback className="bg-[#00A884] text-white">
                    {getInitials(conversation.otherUser.fullName || conversation.otherUser.username)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">
                      {conversation.otherUser.fullName || conversation.otherUser.username}
                    </h3>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                        {formatMessageDate(conversation.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {conversation.lastMessage ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        No messages yet
                      </p>
                    )}
                    
                    <div className="flex items-center ml-2">
                      {conversation.lastMessage && getStatusIcon(conversation.lastMessage.status)}
                      
                      {conversation.unreadCount > 0 && (
                        <span className="ml-1 bg-[#00A884] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating action button */}
      <div className="absolute bottom-6 right-6">
        <Button 
          className="rounded-full w-14 h-14 bg-[#00A884] hover:bg-[#008069] shadow-lg"
          onClick={() => setLocation("/users/search")}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}