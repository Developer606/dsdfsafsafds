import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { TypingIndicator } from "@/components/typing-indicator";
import { apiRequest } from "@/lib/queryClient";

// Types for message and conversation
interface UserMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  status: "sent" | "delivered" | "read";
  timestamp: string;
}

interface UserProfile {
  id: number;
  username: string;
  fullName?: string;
  lastLoginAt?: string;
}

export default function UserMessages() {
  const params = useParams();
  const userId = params.userId ? parseInt(params.userId) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Query to get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) throw new Error("Failed to fetch user data");
      return response.json();
    }
  });
  
  // Query to get other user details
  const { data: otherUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // User not found
          }
          throw new Error("Failed to fetch user");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user details",
        });
        return null;
      }
    },
    enabled: !!userId,
  });
  
  // Query to get messages
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/user-messages", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/user-messages/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        return await response.json();
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load messages",
        });
        return [];
      }
    },
    enabled: !!userId,
    refetchInterval: 5000, // Fallback polling in case WebSocket fails
  });
  
  // Mutation to send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/user-messages/" + userId, "POST", {
        content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    },
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      
      socket.onopen = () => {
        console.log("WebSocket connection established");
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case "new_message":
              // Handle incoming message
              if (data.message.senderId === userId || data.message.receiverId === userId) {
                queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
                
                // If the message is from the user we're chatting with (userId) to us (currentUser.id)
                if (data.message.senderId === userId && data.message.receiverId === currentUser?.id) {
                  // When we receive a message from the other user, mark it as read
                  socket.send(JSON.stringify({
                    type: "message_status_update",
                    messageId: data.message.id,
                    status: "read"
                  }));
                  
                  // Force refresh messages to show the new one
                  queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
                }
                
                // If we sent a message and this is a delivery confirmation
                if (data.message.senderId === currentUser?.id && data.message.receiverId === userId) {
                  // Our message to the other user was delivered, refresh the UI
                  queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
                }
              }
              break;
              
            case "message_status_update":
              // Update message status in UI
              queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
              break;
              
            case "typing_indicator":
              // Show typing indicator when the other user is typing
              if (data.senderId === userId) {
                setIsTyping(data.isTyping);
              }
              break;
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };
      
      socket.onclose = () => {
        console.log("WebSocket connection closed");
        // Attempt to reconnect after a delay
        setTimeout(initWebSocket, 3000);
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket.close();
      };
      
      setWebsocket(socket);
    };
    
    initWebSocket();
    
    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [userId, queryClient, currentUser?.id]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Mark messages as read on component mount
  useEffect(() => {
    if (userId) {
      fetch(`/api/user-messages/${userId}/read`, {
        method: "POST",
      }).catch(error => {
        console.error("Error marking messages as read:", error);
      });
    }
  }, [userId]);
  
  // Handle typing indicator
  useEffect(() => {
    const handleTyping = () => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
      
      websocket.send(JSON.stringify({
        type: "typing_indicator",
        receiverId: userId,
        isTyping: messageText.length > 0
      }));
    };
    
    const typingTimer = setTimeout(handleTyping, 500);
    return () => clearTimeout(typingTimer);
  }, [messageText, websocket, userId]);
  
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    // Send via WebSocket if available
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: "user_message",
        receiverId: userId,
        content: messageText
      }));
    } else {
      // Fallback to API
      sendMessageMutation.mutate(messageText);
    }
    
    setMessageText("");
  };
  
  const goBack = () => {
    setLocation("/home");
  };
  
  // Utility functions
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }
  
  if (!otherUser) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h2 className="text-xl font-bold mb-4">User not found</h2>
        <Button onClick={goBack}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 p-4 flex items-center shadow-md">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 mr-3"
          onClick={goBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <Avatar className="h-10 w-10 mr-3 bg-white/20">
          <AvatarFallback className="bg-white/20 text-white">
            {getInitials(otherUser.fullName || otherUser.username)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{otherUser.fullName || otherUser.username}</h1>
          <p className="text-xs text-white/70">@{otherUser.username}</p>
        </div>
        
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Send a message to start chatting!</p>
          </div>
        ) : (
          messages.map((message: UserMessage) => {
            const isCurrentUser = currentUser && message.senderId === currentUser.id;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isCurrentUser 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-tl-2xl rounded-tr-md rounded-bl-2xl' 
                  : 'bg-white dark:bg-gray-800 rounded-tl-md rounded-tr-2xl rounded-br-2xl shadow-sm'}`}
                >
                  <div className="p-3">
                    <p>{message.content}</p>
                    <div className={`text-xs mt-1 flex items-center ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                      <span>{formatTime(message.timestamp)}</span>
                      
                      {isCurrentUser && (
                        <span className="ml-2">
                          {message.status === "sent" && "✓"}
                          {message.status === "delivered" && "✓✓"}
                          {message.status === "read" && <span className="text-blue-300">✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-tl-md rounded-tr-2xl rounded-br-2xl shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="py-6 rounded-full dark:bg-gray-700"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            disabled={sendMessageMutation.isPending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}