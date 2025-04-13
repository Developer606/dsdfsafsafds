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
  
  // Handle progressive character messages
  useEffect(() => {
    if (!characterId) return;
    
    // Listen for character_message events to handle progressive message delivery
    const handleCharacterMessage = (data: any) => {
      if (!data.isProgressiveUpdate) return;
      
      // Update the query data to reflect the progressive message update
      if (data.message && data.message.characterId === characterId) {
        queryClient.setQueryData<Message[]>(
          [`/api/messages/${characterId}`],
          (oldMessages = []) => {
            // Update the existing message if it exists
            const messageExists = oldMessages.some(msg => msg.id === data.message.id);
            
            if (messageExists) {
              // Replace the message with the updated version
              return oldMessages.map(msg => 
                msg.id === data.message.id ? data.message : msg
              );
            } else {
              // Add the new message
              return [...oldMessages, data.message];
            }
          }
        );
        
        // Auto-scroll to show the updated content
        setTimeout(scrollToBottom, 50);
      }
    };
    
    // Set up listener for progressive character messages
    const removeCharacterMessageListener = socketManager.addEventListener(
      'character_message', 
      handleCharacterMessage
    );
    
    // Clean up listener when component unmounts
    return () => {
      removeCharacterMessageListener();
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