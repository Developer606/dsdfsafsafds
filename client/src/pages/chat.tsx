import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2, MessageCircle, Sun, Moon, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Message, FREE_USER_MESSAGE_LIMIT } from "@shared/schema";
import { type Character } from "@shared/characters";
import { type User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { socketManager } from "@/lib/socket-io-client";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { characterId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [chatStyle, setChatStyle] = useState<"whatsapp" | "chatgpt" | "messenger">("whatsapp");
  const tempMessageIdRef = useRef<string>("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Reset to WhatsApp style if user loses premium status
  useEffect(() => {
    if (!user?.isPremium && chatStyle !== "whatsapp") {
      setChatStyle("whatsapp");
      toast({
        title: "Style Reset",
        description: "Chat style has been reset to WhatsApp. Upgrade to Premium to access additional styles.",
      });
    }
  }, [user?.isPremium, chatStyle]);

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

  const toggleChatStyle = () => {
    // Check if user is free or on basic plan
    if (!user?.isPremium || user?.subscriptionTier === "basic") {
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
          return "whatsapp";
        default:
          return "whatsapp";
      }
    });
  };

  const { data: characters } = useQuery<Character[]>({
    queryKey: ["/api/characters"]
  });
  
  // Add a separate query to fetch this specific character
  const { data: specificCharacter, isLoading: characterLoading } = useQuery<Character>({
    queryKey: [`/api/character/${characterId}`],
    enabled: !!characterId, // Only run query if characterId exists
  });

  // Try to find the character in the loaded characters array first, fall back to specifically fetched character
  const character = characters?.find((c: Character) => c.id === characterId) || specificCharacter;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${characterId}`],
    enabled: !!characterId
  });

  const remainingMessages = user?.isPremium ? Infinity : FREE_USER_MESSAGE_LIMIT - (user?.messageCount || 0);

  const clearChat = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/${characterId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear chat history");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${characterId}`] });
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

  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to logout");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
    onError: (error) => {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again."
      });
    }
  });

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const feedbackData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

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

  const handleClearChat = () => {
    clearChat.mutate();
  };

  const handleLogout = () => {
    logout.mutate();
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);
  
  // Track when user enters and leaves the chat page for character memory system
  useEffect(() => {
    if (characterId && user?.id) {
      console.log(`Opening chat page with character ${characterId}`);
      
      // Notify the server that the user has opened the chat page
      socketManager.notifyChatPageOpen(characterId);
      
      // Also handle document visibility changes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log(`Chat page with ${characterId} is now visible`);
          socketManager.notifyChatPageOpen(characterId);
        } else {
          console.log(`Chat page with ${characterId} is now hidden`);
          socketManager.notifyChatPageClose(characterId);
        }
      };
      
      // Add visibility change listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // When component unmounts (user leaves the page), notify the server
      return () => {
        console.log(`Closing chat page with character ${characterId}`);
        socketManager.notifyChatPageClose(characterId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [characterId, user?.id]);
  
  // Handle progressive character messages and follow-up messages
  useEffect(() => {
    if (!characterId) return;
    
    // Listen for character_message events to handle both progressive updates and follow-up messages
    const handleCharacterMessage = (data: any) => {
      // Process all character messages including follow-up messages
      // Even for non-progressive updates, we want to update the UI immediately
      
      // Update the query data to reflect the message update
      if (data.message && data.message.characterId === characterId) {
        console.log('Handling message in chat component:', data.message.id, 
          data.isProgressiveUpdate ? '(progressive)' : 
          data.isFollowUpMessage ? '(follow-up)' : '(regular)');
        
        // Trigger message update animation
        queryClient.setQueryData<Message[]>(
          [`/api/messages/${characterId}`],
          (oldMessages = []) => {
            // Check if this message already exists in our list
            const messageExists = oldMessages.some(msg => msg.id === data.message.id);
            
            if (messageExists) {
              // Replace the existing message with the updated version
              return oldMessages.map(msg => 
                msg.id === data.message.id ? data.message : msg
              );
            } else {
              // This is a new message (either first progressive chunk or follow-up message)
              const newMessages = [...oldMessages, data.message];
              
              // Sort by timestamp to ensure correct ordering
              return newMessages.sort((a, b) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return dateA - dateB;
              });
            }
          }
        );
        
        // Auto-scroll to show the new content - slight delay for smoother experience
        setTimeout(scrollToBottom, 30);
        
        // If this is a new message (not progressive update), play a sound notification
        if ((!data.isProgressiveUpdate || data.isFollowUpMessage) && !document.hasFocus()) {
          // Try to play a notification sound
          try {
            const audio = new Audio('/sounds/message.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Could not play notification sound:', e));
          } catch (error) {
            console.log('Error playing notification sound:', error);
          }
        }
        
        // CRITICAL FIX: For follow-up messages, DIRECTLY update the messages state without refresh
        if (data.isFollowUpMessage || (!data.isProgressiveUpdate && 
            (data.message.content.includes("As promised") || 
             data.message.content.includes("I'm back") || 
             data.message.content.includes("Just as I said") ||
             data.message.content.includes("As I promised")))) {
          
          console.log('CRITICAL: Follow-up message detected, ensuring immediate display WITHOUT refresh');
          
          // Create direct state update for follow-up messages
          const existingMessages = queryClient.getQueryData<Message[]>([`/api/messages/${characterId}`]) || [];
          
          // Make sure the message isn't already there
          if (!existingMessages.some(msg => msg.id === data.message.id)) {
            console.log('FIXING: Adding follow-up message DIRECTLY to messages:', data.message.id);
            
            // Add message to existing messages
            const updatedMessages = [...existingMessages, data.message];
            
            // Sort by timestamp to ensure proper order
            const sortedMessages = updatedMessages.sort((a, b) => {
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });
            
            // CRITICAL: Force direct cache update with the new message included
            queryClient.setQueryData([`/api/messages/${characterId}`], sortedMessages);
            
            // IMPORTANT: Force immediate scrolling to show the new message
            scrollToBottom();
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
          }
        }
      }
    };
    
    // IMPROVED: Handle new_message event directly for follow-up messages
    const handleNewMessage = (data: any) => {
      console.log('CRITICAL: New_message event received for possible follow-up message:', data);
      
      // If this is a message from the current character, ensure it shows up
      if (data.message && data.message.characterId === characterId && !data.message.isUser) {
        // Check for follow-up messages by content patterns
        const isFollowUp = data.isFollowUpMessage || 
          data.message.content.includes("As promised") || 
          data.message.content.includes("I'm back") || 
          data.message.content.includes("Just as I said") || 
          data.message.content.includes("As I promised");
        
        if (isFollowUp) {
          console.log('CRITICAL FIX: Detected follow-up message via new_message event:', data.message.id);
        }
        
        // Get existing messages
        const existingMessages = queryClient.getQueryData<Message[]>([`/api/messages/${characterId}`]) || [];
        
        // Check if this message already exists
        if (!existingMessages.some(msg => msg.id === data.message.id)) {
          // Add the new message and sort messages
          const updatedMessages = [...existingMessages, data.message].sort((a, b) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          });
          
          console.log('DIRECT ADD: Adding message immediately to messages list:', data.message.id);
          
          // CRITICAL: Update state with the new message included
          queryClient.setQueryData([`/api/messages/${characterId}`], updatedMessages);
          
          // IMPORTANT: Force multiple scrolls to ensure visibility
          scrollToBottom();
          setTimeout(scrollToBottom, 50);
          setTimeout(scrollToBottom, 150);
          
          // Try to play a notification sound for new messages
          if (!document.hasFocus()) {
            try {
              const audio = new Audio('/sounds/message.mp3');
              audio.volume = 0.5;
              audio.play().catch(e => console.log('Could not play notification sound:', e));
            } catch (error) {
              console.log('Error playing notification sound:', error);
            }
          }
        }
      }
    };
    
    // Listen for typing indicator events
    const handleTypingIndicator = (data: any) => {
      console.log("Typing indicator:", data.isTyping);
      setIsTyping(data.isTyping);
    };
    
    // Ensure socket is connected
    if (!socketManager.isConnected()) {
      console.log("Socket not connected in chat component, connecting now...");
      socketManager.connect();
    }

    // Notify server that we're viewing this character's chat
    socketManager.notifyChatPageOpen(characterId);
    
    // Set up listeners for messages and typing indicators
    const removeCharacterMessageListener = socketManager.addEventListener(
      'character_message', 
      handleCharacterMessage
    );
    
    const removeNewMessageListener = socketManager.addEventListener(
      'new_message',
      handleNewMessage
    );
    
    const removeTypingIndicatorListener = socketManager.addEventListener(
      'typing_indicator',
      handleTypingIndicator
    );
    
    // CRITICAL FIX: Aggressive polling for follow-up messages
    console.log("CRITICAL FIX: Setting up aggressive polling for follow-up messages");
    
    // Fetch immediately to get latest messages
    const fetchLatestMessages = () => {
      console.log("CRITICAL: Polling for new messages for character", characterId);
      
      fetch(`/api/messages/${characterId}`)
        .then(res => res.json())
        .then(messages => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Get existing messages from cache
            const existingMessages = queryClient.getQueryData<Message[]>([`/api/messages/${characterId}`]) || [];
            
            // Check if there are new messages
            if (messages.length > existingMessages.length) {
              console.log("CRITICAL: Found new messages in polling response!", messages.length - existingMessages.length);
              
              // Update the messages in the query cache
              queryClient.setQueryData([`/api/messages/${characterId}`], messages);
              
              // CRITICAL: Also directly update the state for immediate UI update
              setMessages(messages);
              
              // Force scroll to bottom to show new messages
              scrollToBottom();
              setTimeout(scrollToBottom, 100);
              
              // Check if any of the new messages are follow-ups
              const newMessages = messages.filter(newMsg => 
                !existingMessages.some(existingMsg => existingMsg.id === newMsg.id)
              );
              
              for (const newMsg of newMessages) {
                const content = newMsg.content || '';
                const isFollowUp = content.includes("As promised") || 
                                  content.includes("I'm back") || 
                                  content.includes("Just as I said") || 
                                  content.includes("As I promised");
                                  
                if (isFollowUp && !newMsg.isUser) {
                  console.log("CRITICAL: Detected follow-up message via polling:", newMsg.id);
                  console.log("Follow-up message content:", content.substring(0, 50));
                }
              }
            }
          }
        })
        .catch(err => console.error("Error fetching latest messages:", err));
    };
    
    // Fetch immediately
    fetchLatestMessages();
    
    // Set up aggressive polling (every 2 seconds) for follow-up messages
    const pollingInterval = setInterval(fetchLatestMessages, 2000);
    
    // Create a cleanup function that includes all necessary cleanup
    const cleanupFunction = () => {
      // Call all the original socket cleanup functions
      removeCharacterMessageListener();
      removeNewMessageListener();
      removeTypingIndicatorListener();
      
      // Also clear our polling interval
      clearInterval(pollingInterval);
      console.log("CRITICAL: Cleared aggressive polling interval");
      
      // Notify server we're closing the chat page
      socketManager.notifyChatPageClose(characterId);
    };
    
    // Clean up listeners when component unmounts
    return () => {
      removeCharacterMessageListener();
      removeNewMessageListener();
      removeTypingIndicatorListener();
      socketManager.notifyChatPageClose(characterId);
    };
  }, [characterId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, language, script }: { content: string; language: string; script?: string }) => {
      if (!user?.isPremium && remainingMessages <= 0) {
        setShowSubscriptionDialog(true);
        throw new Error("Message limit reached. Please upgrade to premium to continue chatting.");
      }

      const tempId = Date.now();
      tempMessageIdRef.current = tempId.toString();

      const userMessage: Message = {
        id: tempId,
        content,
        isUser: true,
        timestamp: new Date(),
        characterId: characterId!,
        userId: user?.id || 0,
        language,
        script: script || null
      };

      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => [...old, userMessage]
      );

      setIsTyping(true);
      scrollToBottom();

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          content,
          language,
          script,
          isUser: true
        })
      });

      if (!res.ok) throw new Error("Failed to send message");

      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);

      return res.json();
    },
    onSuccess: (newMessages: Message[]) => {
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => {
          const filtered = old.filter(msg => msg.id.toString() !== tempMessageIdRef.current);
          return [...filtered, ...newMessages];
        }
      );
      scrollToBottom();
      tempMessageIdRef.current = "";

      // Invalidate user query to update message count
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      setIsTyping(false);
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => old.filter(msg => msg.id.toString() !== tempMessageIdRef.current)
      );
      tempMessageIdRef.current = "";

      // Only show error toast if it's not the message limit error
      if (!error.message.includes("Message limit reached")) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send message"
        });
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!character) return null;

  return (
    <div className={cn(
      "flex flex-col h-screen",
      chatStyle === "whatsapp"
        ? "bg-[#efeae2] dark:bg-slate-900"
        : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900"
          : "bg-white dark:bg-slate-900"
    )}>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b shadow-sm",
        chatStyle === "whatsapp"
          ? "bg-[#008069] dark:bg-slate-900/95 border-[#008069] dark:border-gray-800 h-16 sm:h-18"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900/95 border-gray-200 dark:border-gray-800 h-14 sm:h-16"
          : "bg-white dark:bg-slate-900/95 border-gray-200 dark:border-gray-800 h-14 sm:h-16"
      )}>
        <div className="container h-full mx-auto px-2 sm:px-4 max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/chats")}
              className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                chatStyle === "whatsapp"
                  ? "text-white hover:bg-white/10 transition-colors duration-200"
                  : chatStyle === "messenger"
                  ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors duration-200"
                  : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              )}
            >
              <ArrowLeft className="h-5 w-5 sm:h-5 sm:w-5" />
            </Button>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={cn(
                "relative",
                "w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden",
                chatStyle === "whatsapp" 
                  ? "ring-2 ring-white/30 dark:ring-white/10"
                  : chatStyle === "messenger"
                  ? "ring-2 ring-blue-100 dark:ring-blue-900"
                  : "ring-2 ring-gray-200 dark:ring-gray-700"
              )}>
                <img
                  src={character?.avatar}
                  alt={character?.name}
                  className="w-full h-full object-cover"
                />
                <div className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2",
                  chatStyle === "whatsapp" 
                    ? "bg-green-500 border-[#008069] dark:border-slate-900"
                    : chatStyle === "messenger"
                    ? "bg-green-500 border-white dark:border-slate-900"
                    : "bg-green-500 border-white dark:border-slate-900"
                )}></div>
              </div>
              <div className="flex flex-col">
                <h2 className={cn(
                  "font-semibold text-sm sm:text-base",
                  chatStyle === "whatsapp"
                    ? "text-white"
                    : chatStyle === "messenger"
                    ? "text-gray-800 dark:text-gray-200"
                    : "text-gray-800 dark:text-gray-200"
                )}>
                  {character?.name}
                </h2>
                <span className={cn(
                  "text-xs font-medium",
                  chatStyle === "whatsapp"
                    ? "text-green-100/80"
                    : chatStyle === "messenger"
                    ? "text-green-600 dark:text-green-400"
                    : "text-green-600 dark:text-green-400"
                )}>
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleChatStyle}
                      className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-sm",
                        chatStyle === "whatsapp"
                          ? "text-white hover:bg-white/20 active:bg-white/10 transition-all duration-200"
                          : chatStyle === "messenger"
                          ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800 transition-all duration-200"
                          : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      )}
                    >
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                    <span className={cn(
                      "hidden md:inline-block text-sm font-medium",
                      chatStyle === "whatsapp"
                        ? "text-white/90"
                        : chatStyle === "messenger"
                        ? "text-[#0084ff] dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {chatStyle === "whatsapp"
                        ? "WhatsApp Style"
                        : chatStyle === "messenger"
                        ? "Messenger Style"
                        : "ChatGPT Style"}
                      {!user?.isPremium && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded-md">
                          Premium
                        </span>
                      )}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {user?.isPremium && user?.subscriptionTier !== "basic" ? (
                    <p>Switch to {
                      chatStyle === "whatsapp"
                        ? "ChatGPT"
                        : chatStyle === "chatgpt"
                        ? "Messenger"
                        : "WhatsApp"
                    } style</p>
                  ) : (
                    <p>Upgrade to Premium or Pro plan to access additional chat styles</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex bg-gray-100/80 dark:bg-gray-800/60 rounded-full p-0.5 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                  chatStyle === "whatsapp"
                    ? "text-white hover:bg-white/20 active:bg-white/10 transition-all duration-200"
                    : chatStyle === "messenger"
                    ? "text-[#0084ff] hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-700 transition-all duration-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
                )}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFeedbackDialog(true)}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                  chatStyle === "whatsapp"
                    ? "text-white hover:bg-white/20 active:bg-white/10 transition-all duration-200"
                    : chatStyle === "messenger"
                    ? "text-[#0084ff] hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-700 transition-all duration-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
                )}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                  chatStyle === "whatsapp"
                    ? "text-white hover:bg-white/20 active:bg-white/10 transition-all duration-200"
                    : chatStyle === "messenger"
                    ? "text-[#0084ff] hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-700 transition-all duration-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
                )}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                  chatStyle === "whatsapp"
                    ? "text-white hover:bg-white/20 active:bg-white/10 transition-all duration-200"
                    : chatStyle === "messenger"
                    ? "text-[#0084ff] hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-700 transition-all duration-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
                )}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 overflow-y-auto pt-14 sm:pt-16 pb-20",
        chatStyle === "whatsapp"
          ? "bg-[#efeae2] dark:bg-slate-900"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900"
          : "bg-white dark:bg-slate-900"
      )}>
        <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
          {messagesLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : (
            <>
              {messages.map((message: Message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  character={character!}
                  chatStyle={chatStyle}
                />
              ))}
              {isTyping && <TypingIndicator chatStyle={chatStyle} />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      <footer className={cn(
        "fixed bottom-0 left-0 right-0 border-t shadow-md",
        chatStyle === "whatsapp"
          ? "bg-[#f0f2f5] dark:bg-slate-900/95 border-gray-200 dark:border-gray-800"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900/95 border-gray-200 dark:border-gray-800"
          : "bg-white dark:bg-slate-900/95 border-gray-200 dark:border-gray-800"
      )}>
        <div className="container mx-auto px-2 sm:px-4 py-2.5 sm:py-4 max-w-4xl">
          <ChatInput
            onSend={(content, language, script) => sendMessage.mutate({ content, language, script })}
            isLoading={sendMessage.isPending}
            chatStyle={chatStyle}
          />
          {!user?.isPremium && (
            <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mt-2 px-2 py-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg mx-auto max-w-[250px]">
              {remainingMessages} messages remaining
            </div>
          )}
        </div>
      </footer>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send us a message</DialogTitle>
            <DialogDescription>
              Have a question or feedback? We'd love to hear from you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                name="message"
                placeholder="Your message..."
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Send Message</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SubscriptionDialog
        open={showSubscriptionDialog}
        onClose={() => setShowSubscriptionDialog(false)}
      />
    </div>
  );
}