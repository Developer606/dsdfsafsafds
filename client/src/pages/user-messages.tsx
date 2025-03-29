import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Send, MoreVertical, AlertTriangle, ShieldAlert,
  LogOut, Trash2, MessageCircle, Sun, Moon, MessageSquare,
  Image as ImageIcon, X, Lock, KeyRound, LockOpen
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { TypingIndicator } from "@/components/typing-indicator";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/lib/socket-io-client";
import { MessageBubble } from "@/components/message-bubble";
import { useMessageStatusTracker } from "@/lib/message-status-tracker";
import { useEncryption } from "@/hooks/use-encryption";
import { isMessageEncrypted } from "@/lib/encryption-client";
import DecryptedMessage from "@/components/decrypted-message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { queryClient } from "@/lib/queryClient";

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
  avatarUrl?: string;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const socketManager = useSocket();
  const { trackStatusChange, shouldAnimateStatus } = useMessageStatusTracker();
  
  // New state variables for theme and chat style functionality
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  // State for the encryption setup dialog
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [chatStyle, setChatStyle] = useState<"whatsapp" | "chatgpt" | "messenger" | "kakaotalk">("whatsapp");
  
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
  const { data: messagesData = { messages: [], pagination: { total: 0, page: 1, pages: 1, limit: 20 } }, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/user-messages", userId],
    queryFn: async () => {
      try {
        console.log(`Fetching messages for conversation with user ${userId}`);
        const response = await fetch(`/api/user-messages/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        console.log(`Received ${data.messages?.length || 0} messages, conversation status:`, data.conversationStatus);
        return data;
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
    // Reduced staleTime to ensure we get fresh data more often
    staleTime: 1000,
  });
  
  // Extract messages and conversation status from the response
  const messages = messagesData.messages || [];
  
  // Initialize encryption hook once we have user IDs
  const encryption = useEncryption({
    userId: currentUser?.id || 0,
    otherUserId: userId
  });
  
  // Create local state for conversation blocked status that can be updated by socket events
  const [isConversationBlocked, setIsConversationBlocked] = useState<boolean>(false);
  
  // Update local state whenever the API response changes
  useEffect(() => {
    const blockedStatus = messagesData.conversationStatus?.isBlocked || false;
    console.log(`Setting conversation blocked status from API: ${blockedStatus}`);
    setIsConversationBlocked(blockedStatus);
  }, [messagesData.conversationStatus]);
  
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
      console.log("Current user:", currentUser?.id, "Chat with:", userId);
      
      // Show typing indicator when the other user is typing to us
      // The senderId should be the other user, and the receiverId should be us
      if (data && data.senderId && data.receiverId) {
        // The user we're chatting with is typing to us
        if (data.senderId === Number(userId) && data.receiverId === currentUser?.id) {
          console.log("✅ Setting typing indicator to:", data.isTyping);
          setIsTyping(data.isTyping);
        } else {
          console.log("❌ Ignoring typing indicator from user", data.senderId, "to", data.receiverId);
        }
      }
    };
    
    // Handle conversation refresh events (e.g., when conversation is blocked/unblocked)
    const refreshConversationHandler = (data: any) => {
      console.log("Conversation refresh event received:", data);
      
      // Make sure the event is relevant to the current conversation
      if (data.otherUserId && (data.otherUserId === userId || data.otherUserId === currentUser?.id)) {
        console.log("Refresh event is for the current conversation, forcing update");
        
        // Check if this is a force refresh
        const isForce = data.force === true;
        
        if (isForce) {
          console.log(`[Socket] Force refreshing conversation with ${userId}`);
          
          // Force a direct API call to check conversation status
          fetch(`/api/conversations/${userId}/status`)
            .then(res => res.json())
            .then(statusData => {
              console.log(`[Socket] Direct conversation status check:`, statusData);
              // Update state directly from the API response
              setIsConversationBlocked(!!statusData.isBlocked);
            })
            .catch(err => console.error(`[Socket] Error checking conversation status:`, err));
        }
        
        // Force immediate refresh of messages and conversation status
        refetchMessages();
        
        // Invalidate the cache to ensure we get fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
        
        // When the server sends a refresh event, it means something important changed
        // Let's add a toast notification to inform the user
        toast({
          title: "Conversation Updated",
          description: "This conversation has been updated by a moderator.",
          duration: 5000
        });
      }
    };
    
    // Handle conversation status updates
    const conversationStatusUpdateHandler = (data: any) => {
      console.log("Conversation status update received:", data);
      
      // Make sure the event is relevant to the current conversation
      if (data.otherUserId == userId) { // Intentionally using loose equality for string/number comparison
        console.log(`Conversation status update for current conversation: isBlocked=${data.isBlocked}, timestamp=${data.timestamp}`);
        
        // Ensure we have the boolean value
        const newBlockedStatus = !!data.isBlocked;
        
        // Directly update our local state with the new blocked status
        setIsConversationBlocked(newBlockedStatus);
        console.log(`[Socket] Updated conversation blocked status to: ${newBlockedStatus}`);
        
        // Force refetch to ensure UI is in sync with the latest data
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: [`/api/user-messages/${userId}`] });
        
        // Also fetch conversation status directly from API to ensure our UI is in sync
        setTimeout(() => {
          fetch(`/api/conversations/${userId}/status`)
            .then(res => res.json())
            .then(statusData => {
              console.log(`[API] Direct conversation status check:`, statusData);
              // Update state again if API response differs from socket event
              if (statusData.isBlocked !== newBlockedStatus) {
                console.log(`[API] Correcting conversation blocked status to: ${statusData.isBlocked}`);
                setIsConversationBlocked(statusData.isBlocked);
              }
            })
            .catch(err => console.error("Error fetching conversation status:", err));
        }, 1000); // Delay slightly to allow DB updates to complete
        
        // Show notification based on new status
        if (newBlockedStatus) {
          toast({
            variant: "destructive",
            title: "Conversation Blocked",
            description: "This conversation has been blocked by a moderator for violating our community guidelines.",
            duration: 8000
          });
        } else {
          // If conversation was previously blocked, notify user it's now unblocked
          if (isConversationBlocked) {
            toast({
              title: "Conversation Unblocked",
              description: "This conversation has been unblocked. You can now send messages.",
              duration: 5000
            });
          }
        }
      }
    };
    
    // Register event listeners
    const removeNewMessageListener = socketManager.addEventListener('new_message', newMessageHandler);
    const removeMessageSentListener = socketManager.addEventListener('message_sent', messageSentHandler);
    const removeMessageStatusListener = socketManager.addEventListener('message_status', messageStatusHandler);
    const removeTypingListener = socketManager.addEventListener('typing_indicator', typingIndicatorHandler);
    const removeServerErrorListener = socketManager.addEventListener('server_error', serverErrorHandler);
    const removeRefreshListener = socketManager.addEventListener('refresh_conversation', refreshConversationHandler);
    const removeStatusUpdateListener = socketManager.addEventListener('conversation_status_update', conversationStatusUpdateHandler);
    
    // Cleanup function
    return () => {
      console.log("Cleaning up Socket.IO listeners");
      removeNewMessageListener();
      removeMessageSentListener();
      removeMessageStatusListener();
      removeTypingListener();
      removeServerErrorListener();
      removeRefreshListener();
      removeStatusUpdateListener();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUser?.id, queryClient, socketManager, trackStatusChange, isConversationBlocked, setIsConversationBlocked]);
  
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
  
  // Mark received messages as read when the user views them
  useEffect(() => {
    if (currentUser && messages.length > 0 && socketManager) {
      // Only process messages that are from the other user and not already read
      const unreadMessages = messages.filter(
        (message: UserMessage) => 
          message.senderId === Number(String(userId)) && 
          message.receiverId === currentUser.id && 
          message.status !== "read"
      );
      
      if (unreadMessages.length > 0) {
        console.log(`Marking ${unreadMessages.length} messages as read`);
        
        // High throughput optimization: Use batch update for better performance
        if (unreadMessages.length > 1) {
          // Extract message IDs
          const messageIds = unreadMessages.map(message => message.id);
          
          // Use batch update to reduce network traffic and database operations
          socketManager.updateMessageStatusBatch(messageIds, "read");
        } else {
          // For a single message, use the standard update to maintain compatibility
          socketManager.updateMessageStatus(unreadMessages[0].id, "read");
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUser, userId]);
  
  // Add theme toggle function
  const toggleTheme = () => {
    const doc = document.documentElement;
    const isDark = doc.classList.contains('dark');
    if (isDark) {
      doc.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      doc.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)"
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Image must be less than 5MB"
      });
      return;
    }
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle image removal
  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('video/')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select a video file (MP4, WebM, etc.)"
      });
      return;
    }
    
    // Check file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Video must be less than 15MB"
      });
      return;
    }
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedVideo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle video removal
  const handleClearVideo = () => {
    setSelectedVideo(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Add chat style toggle function with premium check
  const toggleChatStyle = () => {
    // Check if user is free or on basic plan
    if (!currentUser?.isPremium || currentUser?.subscriptionTier === "basic") {
      setShowSubscriptionDialog(true);
      return;
    }
    
    setChatStyle(prev => {
      switch (prev) {
        case "whatsapp":
          return "chatgpt";
        case "chatgpt":
          return "messenger";
        case "messenger":
          return "kakaotalk";
        case "kakaotalk":
          return "whatsapp";
        default:
          return "whatsapp";
      }
    });
  };
  
  // Reset to WhatsApp style if user loses premium status or is on basic plan
  useEffect(() => {
    if ((!currentUser?.isPremium || currentUser?.subscriptionTier === "basic") && chatStyle !== "whatsapp") {
      setChatStyle("whatsapp");
      toast({
        title: "Style Reset",
        description: "Chat style has been reset to WhatsApp. Upgrade to Premium or Pro plan to access additional styles.",
      });
    }
  }, [currentUser?.isPremium, currentUser?.subscriptionTier, chatStyle, toast]);
  
  // Clear chat function
  const clearChat = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/user-messages/${userId}/clear`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear chat history");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages", userId] });
      toast({
        title: "Chat Cleared",
        description: "Your chat history has been cleared successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history",
      });
    },
  });
  
  const handleClearChat = () => {
    clearChat.mutate();
  };
  
  // Logout function
  const logout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout",
      });
    },
  });
  
  const handleLogout = () => {
    logout.mutate();
  };
  
  // Function to handle feedback submission
  const handleSubmitFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const feedbackData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      content: formData.get("content") as string,
      rating: parseInt(formData.get("rating") as string) || 5,
    };

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });
      
      toast({
        title: "Success",
        description: "Thank you for your feedback! We'll get back to you soon.",
      });
      setShowFeedbackDialog(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
      });
    }
  };
  
  // Mark messages as read on component mount and handle refresh
  useEffect(() => {
    if (userId) {
      // Mark messages as read
      fetch(`/api/user-messages/${userId}/read`, {
        method: "POST",
      }).catch(error => {
        console.error("Error marking messages as read:", error);
      });
      
      // Force refresh conversation when component mounts to ensure we have latest status
      socketManager.refreshConversation(userId, true); // Pass true to force a thorough refresh
      
      // Set an interval to periodically check conversation status
      const statusCheckInterval = setInterval(() => {
        if (!isConversationBlocked) {
          refetchMessages();
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(statusCheckInterval);
    }
  }, [userId, socketManager, isConversationBlocked, refetchMessages]);
  
  // Handle typing indicator
  useEffect(() => {
    if (!currentUser?.id || !userId) return;
    
    const handleTyping = () => {
      try {
        // Send typing indicator from current user (sender) to the other user (receiver)
        // First parameter is the receiverId, second is the isTyping status
        socketManager.sendTypingIndicator(Number(userId), messageText.length > 0);
        console.log(`Sending typing indicator to user ${userId}, isTyping: ${messageText.length > 0}`);
      } catch (err) {
        console.error("Error sending typing indicator:", err);
      }
    };
    
    // Add debounce to avoid sending too many events
    const typingTimer = setTimeout(handleTyping, 300);
    return () => clearTimeout(typingTimer);
  }, [messageText, userId, socketManager, currentUser?.id]);
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have text, image, or video content to send
    if (!messageText.trim() && !selectedImage && !selectedVideo) return;
    
    // Don't send if conversation is blocked
    if (isConversationBlocked) {
      toast({
        variant: "destructive",
        title: "Conversation Blocked",
        description: "This conversation has been blocked by a moderator."
      });
      return;
    }
    
    // Create message content including media data if present
    // Always use JSON structure for all messages (text, image, video)
    let messageContent;
    
    if (selectedImage) {
      messageContent = JSON.stringify({ text: messageText, imageData: selectedImage });
    } else if (selectedVideo) {
      messageContent = JSON.stringify({ text: messageText, videoData: selectedVideo });
    } else {
      // Store text messages in JSON format as well
      messageContent = JSON.stringify({ text: messageText });
    }
    
    try {
      // Encrypt the message if encryption is enabled
      let content = messageContent;
      if (encryption.isEncryptionEnabled) {
        console.log("Encrypting message before sending...");
        content = await encryption.encryptMessage(messageContent);
      }
      
      // Send via Socket.IO
      if (socketManager.isConnected()) {
        socketManager.sendMessage(userId, content);
      } else {
        // Fallback to API
        sendMessageMutation.mutate(content);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    }
    
    // Reset form
    setMessageText("");
    setSelectedImage(null);
    setSelectedVideo(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
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
    <div className={cn(
      "flex flex-col h-screen",
      chatStyle === "whatsapp"
        ? "bg-[#efeae2] dark:bg-slate-900"
        : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900"
          : chatStyle === "kakaotalk"
            ? "bg-[#ffd9d9] dark:bg-[#ffc0c0]"
            : "bg-white dark:bg-slate-900"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 flex items-center shadow-md",
        chatStyle === "whatsapp"
          ? "bg-[#008069] dark:bg-slate-900 border-[#008069] dark:border-gray-800"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
          : chatStyle === "kakaotalk"
          ? "bg-[#faa7a7] dark:bg-[#ff9a9a] border-[#faa7a7] dark:border-[#ff9a9a]"
          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
      )}>
        <Button 
          variant="ghost"
          size="icon" 
          className={cn(
            "mr-3 h-8 w-8 sm:h-9 sm:w-9 rounded-full",
            chatStyle === "whatsapp"
              ? "text-white hover:bg-white/10"
              : chatStyle === "messenger"
              ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
              : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-10 w-10 mr-3 bg-white/20">
          <AvatarFallback className={cn(
            chatStyle === "whatsapp"
              ? "bg-white/20 text-white"
              : chatStyle === "messenger"
              ? "bg-[#0084ff]/20 text-[#0084ff] dark:bg-blue-500/20 dark:text-blue-300"
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          )}>
            {getInitials(otherUser.fullName || otherUser.username)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className={cn(
            "text-lg font-bold",
            chatStyle === "whatsapp"
              ? "text-white"
              : chatStyle === "messenger"
              ? "text-[#0084ff] dark:text-blue-400"
              : "text-gray-800 dark:text-gray-200"
          )}>{otherUser.fullName || otherUser.username}</h1>
          <p className={cn(
            "text-xs",
            chatStyle === "whatsapp"
              ? "text-white/70"
              : chatStyle === "messenger"
              ? "text-[#0084ff]/70 dark:text-blue-400/70"
              : "text-gray-500 dark:text-gray-400"
          )}>@{otherUser.username}</p>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleChatStyle}
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
                      chatStyle === "whatsapp"
                        ? "text-white hover:bg-white/10"
                        : chatStyle === "messenger"
                        ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                        : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <span className={cn(
                    "hidden md:inline-block text-sm",
                    chatStyle === "whatsapp"
                      ? "text-white/90"
                      : chatStyle === "messenger"
                      ? "text-[#0084ff] dark:text-blue-400"
                      : chatStyle === "kakaotalk"
                      ? "text-pink-800 dark:text-pink-200"
                      : "text-gray-600 dark:text-gray-400"
                  )}>
                    {chatStyle === "whatsapp"
                      ? "WhatsApp Style"
                      : chatStyle === "messenger"
                      ? "Messenger Style"
                      : chatStyle === "kakaotalk"
                      ? "KakaoTalk Style"
                      : "ChatGPT Style"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {currentUser?.isPremium && currentUser?.subscriptionTier !== "basic" ? (
                  <p>Switch to {
                    chatStyle === "whatsapp"
                      ? "ChatGPT"
                      : chatStyle === "chatgpt"
                      ? "Messenger"
                      : chatStyle === "messenger"
                      ? "KakaoTalk"
                      : "WhatsApp"
                  } style</p>
                ) : (
                  <p>Upgrade to Premium or Pro plan to access additional chat styles</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
              chatStyle === "whatsapp"
                ? "text-white hover:bg-white/10"
                : chatStyle === "messenger"
                ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFeedbackDialog(true)}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
              chatStyle === "whatsapp"
                ? "text-white hover:bg-white/10"
                : chatStyle === "messenger"
                ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
              chatStyle === "whatsapp"
                ? "text-white hover:bg-white/10"
                : chatStyle === "messenger"
                ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
              chatStyle === "whatsapp"
                ? "text-white hover:bg-white/10"
                : chatStyle === "messenger"
                ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4 space-y-3",
        chatStyle === "whatsapp"
          ? "bg-[#efeae2] dark:bg-slate-900"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900"
          : chatStyle === "kakaotalk"
          ? "bg-[#ffd9d9] dark:bg-[#ffc0c0]"
          : "bg-white dark:bg-slate-900"
      )}>
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
            <div className={cn(
              "animate-spin rounded-full h-8 w-8 border-b-2",
              chatStyle === "whatsapp"
                ? "border-[#008069]"
                : chatStyle === "messenger"
                ? "border-[#0084ff]"
                : "border-purple-500"
            )}></div>
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
                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${chatStyle === "chatgpt" ? "w-full" : ""}`}>
                  {(() => {
                    // All messages are now stored as JSON
                    let messageContent = "";
                    let imageData = null;
                    let videoData = null;
                    let isEncrypted = false;
                    
                    // Check if the message is encrypted
                    if (isMessageEncrypted(message.content)) {
                      isEncrypted = true;
                      
                      return (
                        <MessageBubble
                          id={message.id}
                          content={
                            <div className="flex flex-col">
                              <div className="flex items-center mb-1 text-xs">
                                <Lock className="h-3 w-3 mr-1 text-green-500" /> 
                                <span className="text-green-500">Encrypted message</span>
                              </div>
                              <div>
                                {encryption.isEncryptionEnabled ? (
                                  <DecryptedMessage 
                                    encryptedText={message.content}
                                    decryptFn={encryption.decryptMessage}
                                  />
                                ) : (
                                  <span className="italic text-gray-500">
                                    [Enable encryption to view this message]
                                  </span>
                                )}
                              </div>
                            </div>
                          }
                          timestamp={message.timestamp}
                          status={message.status}
                          isCurrentUser={isCurrentUser}
                          hasDeliveryAnimation={hasStatusAnimation}
                          chatStyle={chatStyle}
                          avatar={isCurrentUser ? undefined : otherUser.avatarUrl}
                          userName={isCurrentUser ? undefined : (otherUser.fullName || otherUser.username)}
                        />
                      );
                    }
                    
                    try {
                      // Attempt to parse as JSON for non-encrypted messages
                      const parsedContent = JSON.parse(message.content);
                      
                      // Extract the text content
                      messageContent = parsedContent.text || '';
                      
                      // Extract media data if present
                      if (parsedContent.imageData) {
                        imageData = parsedContent.imageData;
                      } else if (parsedContent.videoData) {
                        videoData = parsedContent.videoData;
                      }
                    } catch (e) {
                      // For backward compatibility with older messages that weren't stored as JSON
                      messageContent = message.content;
                    }
                    
                    return (
                      <MessageBubble
                        id={message.id}
                        content={messageContent}
                        timestamp={message.timestamp}
                        status={message.status}
                        isCurrentUser={isCurrentUser}
                        hasDeliveryAnimation={hasStatusAnimation}
                        chatStyle={chatStyle}
                        avatar={isCurrentUser ? undefined : otherUser.avatarUrl}
                        userName={isCurrentUser ? undefined : (otherUser.fullName || otherUser.username)}
                        imageData={imageData}
                        videoData={videoData}
                      />
                    );
                  })()}
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
            <div className={cn(
              "p-3 shadow-sm",
              chatStyle === "whatsapp"
                ? "bg-white dark:bg-slate-800 rounded-tl-md rounded-tr-2xl rounded-br-2xl"
                : chatStyle === "messenger"
                ? "bg-gray-100 dark:bg-slate-800 rounded-full"
                : "bg-white dark:bg-slate-800 rounded-lg"
            )}>
              <TypingIndicator style={chatStyle as 'default' | 'whatsapp' | 'messenger' | 'kakao'} />
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className={cn(
        "p-4 border-t",
        chatStyle === "whatsapp"
          ? "bg-[#f0f2f5] dark:bg-slate-800 border-[#f0f2f5] dark:border-gray-700"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
          : chatStyle === "kakaotalk"
          ? "bg-[#fcc8c8] dark:bg-[#ffb5b5] border-[#ffb5b5] dark:border-[#ffaaaa]"
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
      )}>
        {isConversationBlocked ? (
          <div className="flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            <p>Messaging has been disabled by a moderator</p>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex flex-col space-y-2">
            {/* Image preview if selected */}
            {selectedImage && (
              <div className="relative w-full max-w-xs mx-auto mb-2">
                <img 
                  src={selectedImage} 
                  alt="Selected image" 
                  className="w-full object-contain rounded-lg max-h-[200px]" 
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleClearImage}
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Video preview if selected */}
            {selectedVideo && (
              <div className="relative w-full max-w-xs mx-auto mb-2">
                <video 
                  src={selectedVideo}
                  className="w-full object-contain rounded-lg max-h-[200px]" 
                  controls
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleClearVideo}
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {/* Hidden image file input */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageSelect}
                className="hidden"
                ref={fileInputRef}
              />
              
              {/* Hidden video file input */}
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoSelect}
                className="hidden"
                ref={videoInputRef}
              />
              
              {/* Image upload button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-12 w-12",
                  chatStyle === "whatsapp"
                    ? "rounded-full text-[#008069] hover:bg-gray-100 dark:text-green-500 dark:hover:bg-slate-700"
                    : chatStyle === "messenger"
                    ? "rounded-full text-[#0084ff] hover:bg-gray-100 dark:text-blue-500 dark:hover:bg-slate-700"
                    : chatStyle === "kakaotalk"
                    ? "rounded-full text-pink-700 hover:bg-pink-100 dark:text-pink-400 dark:hover:bg-pink-900/40"
                    : "rounded-md text-purple-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                )}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              
              {/* Video upload button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "h-12 w-12",
                  chatStyle === "whatsapp"
                    ? "rounded-full text-[#008069] hover:bg-gray-100 dark:text-green-500 dark:hover:bg-slate-700"
                    : chatStyle === "messenger"
                    ? "rounded-full text-[#0084ff] hover:bg-gray-100 dark:text-blue-500 dark:hover:bg-slate-700"
                    : chatStyle === "kakaotalk"
                    ? "rounded-full text-pink-700 hover:bg-pink-100 dark:text-pink-400 dark:hover:bg-pink-900/40"
                    : "rounded-md text-purple-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 10 4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14"></path>
                  <rect width="14" height="14" x="3" y="5" rx="2" ry="2"></rect>
                </svg>
              </Button>
              
              {/* Text input */}
              <Input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className={cn(
                  "py-6",
                  chatStyle === "whatsapp"
                    ? "rounded-full bg-white dark:bg-slate-700"
                    : chatStyle === "messenger"
                    ? "rounded-full bg-gray-100 dark:bg-slate-700"
                    : chatStyle === "kakaotalk"
                    ? "rounded-md bg-white dark:bg-slate-700"
                    : "rounded-md bg-white dark:bg-slate-700"
                )}
              />
              
              {/* Send button */}
              <Button 
                type="submit" 
                size="icon" 
                className={cn(
                  "h-12 w-12",
                  chatStyle === "whatsapp"
                    ? "rounded-full bg-[#008069] hover:bg-[#00705c]"
                    : chatStyle === "messenger"
                    ? "rounded-full bg-[#0084ff] hover:bg-[#0070db]"
                    : chatStyle === "kakaotalk"
                    ? "rounded-full bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800"
                    : "rounded-md bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                )}
                disabled={sendMessageMutation.isPending || (!messageText.trim() && !selectedImage && !selectedVideo)}
              >
                <Send className="h-5 w-5 text-white" />
              </Button>
            </div>
          </form>
        )}
      </div>
      
      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Share Your Feedback
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              We value your feedback! Let us know how we can improve.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  required
                  className="bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Your Feedback
              </label>
              <Textarea
                id="content"
                name="content"
                rows={4}
                placeholder="Please share your thoughts, suggestions, or report any issues..."
                required
                className="bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label
                htmlFor="rating"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Rating
              </label>
              <Input
                id="rating"
                name="rating"
                type="number"
                min="1"
                max="5"
                defaultValue="5"
                className="bg-white dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                1 = Poor, 5 = Excellent
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Submit Feedback</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Subscription Dialog */}
      <SubscriptionDialog
        open={showSubscriptionDialog}
        onClose={() => setShowSubscriptionDialog(false)}
      />
    </div>
  );
}