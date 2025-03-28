import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, MoreVertical, AlertTriangle, ShieldAlert } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { TypingIndicator } from "@/components/typing-indicator";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/lib/socket-io-client";
import { MessageBubble } from "@/components/message-bubble";
import { useMessageStatusTracker } from "@/lib/message-status-tracker";

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

interface ConversationStatus {
  isBlocked: boolean;
}

export default function UserMessages() {
  const params = useParams();
  const userId = params.userId ? parseInt(params.userId) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const socketManager = useSocket();
  const { trackStatusChange, shouldAnimateStatus } = useMessageStatusTracker();
  
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
  const { data: messagesData = { messages: [], pagination: { total: 0, page: 1, pages: 1, limit: 20 } }, isLoading: isLoadingMessages } = useQuery({
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
        return { messages: [], pagination: { total: 0, page: 1, pages: 1, limit: 20 } };
      }
    },
    enabled: !!userId,
    refetchInterval: 5000, // Fallback polling in case WebSocket fails
  });
  
  // Extract messages and conversation status from the response
  const messages = messagesData.messages || [];
  
  // Check for conversation blocked status from the API response
  const isConversationBlocked = messagesData.conversationStatus?.isBlocked || false;
  
  console.log("Conversation status:", { isBlocked: isConversationBlocked, userId });
  
  // Mutation to send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/user-messages/${userId}`, {
        content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
    },
    onError: (error: any) => {
      console.error("Error sending message:", error);

      // Handle blocked conversation error
      if (error.response?.status === 403 && error.response?.data?.error === "Conversation blocked") {
        toast({
          variant: "destructive",
          title: "Conversation Blocked",
          description: error.response?.data?.message || "This conversation has been blocked by a moderator."
        });
        
        // Refresh messages to show the blocked state
        queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
      } else {
        // Generic error
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send message",
        });
      }
    },
  });

  // Initialize Socket.IO connection and message listeners
  useEffect(() => {
    if (!currentUser?.id || !userId) return;
    
    console.log(`Setting up Socket.IO for user ${currentUser.id} to chat with user ${userId}`);
    
    // Connect to the Socket.IO server
    const socket = socketManager.connect();
    
    // Set up server error handler
    const serverErrorHandler = (error: any) => {
      console.error("Server error received:", error);
      
      // Handle conversation blocked error
      if (error.code === 'CONVERSATION_BLOCKED') {
        // Display error toast
        toast({
          variant: "destructive",
          title: "Conversation Blocked",
          description: error.message || "This conversation has been blocked by a moderator."
        });
        
        // Refresh the conversation data to show the blocked state
        queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
      }
    };
    
    // Set up message listeners
    const newMessageHandler = (data: any) => {
      if (!data.message) return;
      
      console.log("New message received:", data.message);
      console.log("Current users:", { currentUserId: currentUser?.id, chatWithUserId: userId });
      
      // If the message involves the current conversation participants
      const involvesChatUser = 
        (data.message.senderId === userId && data.message.receiverId === currentUser?.id) || 
        (data.message.senderId === currentUser?.id && data.message.receiverId === userId);
      
      if (involvesChatUser) {
        console.log("Message is part of current conversation, refreshing chat");
        // Always refresh the messages in this conversation
        queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
        
        // If the message is from the user we're chatting with, mark it as read
        if (data.message.senderId === userId && data.message.receiverId === currentUser?.id) {
          console.log("Marking message as read:", data.message.id);
          socketManager.updateMessageStatus(data.message.id, "read");
        }
      }
    };
    
    const messageSentHandler = (data: any) => {
      console.log("Message sent confirmation received:", data);
      // Message successfully sent, refresh the conversation
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
    };
    
    const messageStatusHandler = (data: any) => {
      console.log("Message status update received:", data);
      
      // Track status change for animation
      if (data.messageId && data.status) {
        trackStatusChange(data.messageId, data.status);
      }
      
      // Update message status in UI
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
    };
    
    const typingIndicatorHandler = (data: any) => {
      console.log("Typing indicator received:", data);
      // Show typing indicator when the other user is typing
      if (data.senderId === userId) {
        setIsTyping(data.isTyping);
      }
    };
    
    // Register event listeners
    const removeNewMessageListener = socketManager.addEventListener('new_message', newMessageHandler);
    const removeMessageSentListener = socketManager.addEventListener('message_sent', messageSentHandler);
    const removeMessageStatusListener = socketManager.addEventListener('message_status', messageStatusHandler);
    const removeTypingListener = socketManager.addEventListener('typing_indicator', typingIndicatorHandler);
    const removeServerErrorListener = socketManager.addEventListener('server_error', serverErrorHandler);
    
    // Cleanup function
    return () => {
      console.log("Cleaning up Socket.IO listeners");
      removeNewMessageListener();
      removeMessageSentListener();
      removeMessageStatusListener();
      removeTypingListener();
      removeServerErrorListener();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUser?.id, queryClient, socketManager, trackStatusChange]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Track message status changes for animations
  useEffect(() => {
    if (currentUser && messages.length > 0) {
      messages.forEach((message: UserMessage) => {
        if (message.senderId === currentUser.id) {
          trackStatusChange(message.id, message.status);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUser]);
  
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
      socketManager.sendTypingIndicator(userId, messageText.length > 0);
    };
    
    const typingTimer = setTimeout(handleTyping, 500);
    return () => clearTimeout(typingTimer);
  }, [messageText, userId, socketManager]);
  
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    // Don't send if conversation is blocked
    if (isConversationBlocked) {
      toast({
        variant: "destructive",
        title: "Conversation Blocked",
        description: "This conversation has been blocked by a moderator."
      });
      return;
    }
    
    // Send via Socket.IO
    if (socketManager.isConnected()) {
      socketManager.sendMessage(userId, messageText);
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
        {/* Blocked Conversation Banner */}
        {isConversationBlocked && (
          <Alert variant="destructive" className="mb-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle>Conversation Blocked</AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              This conversation has been blocked by a moderator for violating our community guidelines. 
              You cannot send new messages in this conversation.
            </AlertDescription>
          </Alert>
        )}
        
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
          <AnimatePresence>
            {messages.map((message: UserMessage) => {
              const isCurrentUser = currentUser && message.senderId === currentUser.id;
              const hasStatusAnimation = shouldAnimateStatus(message.id);
              
              return (
                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <MessageBubble
                    id={message.id}
                    content={message.content}
                    timestamp={message.timestamp}
                    status={message.status}
                    isCurrentUser={isCurrentUser}
                    hasDeliveryAnimation={hasStatusAnimation}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        )}
        
        {isTyping && !isConversationBlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-gray-800 p-3 rounded-tl-md rounded-tr-2xl rounded-br-2xl shadow-sm">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {isConversationBlocked ? (
          <div className="flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            <p>Messaging has been disabled by a moderator</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}