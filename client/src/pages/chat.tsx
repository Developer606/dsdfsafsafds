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
    if (!user?.isPremium) {
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

  const character = characters?.find((c: Character) => c.id === characterId);

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
        timestamp: new Date().toISOString(),
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
        "fixed top-0 left-0 right-0 z-50 border-b h-14 sm:h-16",
        chatStyle === "whatsapp"
          ? "bg-[#008069] dark:bg-slate-900 border-[#008069] dark:border-gray-800"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
      )}>
        <div className="container h-full mx-auto px-2 sm:px-4 max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
              size="icon"
              onClick={() => setLocation("/chats")}
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
                chatStyle === "whatsapp"
                  ? "text-white hover:bg-white/10"
                  : chatStyle === "messenger"
                  ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                  : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={character?.avatar}
                alt={character?.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <h2 className={cn(
                "font-medium text-sm sm:text-base",
                chatStyle === "whatsapp"
                  ? "text-white"
                  : chatStyle === "messenger"
                  ? "text-[#0084ff]"
                  : "text-gray-800 dark:text-gray-200"
              )}>
                {character?.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
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
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {chatStyle === "whatsapp"
                        ? "WhatsApp Style"
                        : chatStyle === "messenger"
                        ? "Messenger Style"
                        : "ChatGPT Style"}
                      {!user?.isPremium && " (Premium)"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {user?.isPremium ? (
                    <p>Switch to {
                      chatStyle === "whatsapp"
                        ? "ChatGPT"
                        : chatStyle === "chatgpt"
                        ? "Messenger"
                        : "WhatsApp"
                    } style</p>
                  ) : (
                    <p>Upgrade to Premium to access additional chat styles</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
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
              variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
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
              variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
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
              variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
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
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      <footer className={cn(
        "fixed bottom-0 left-0 right-0 border-t",
        chatStyle === "whatsapp"
          ? "bg-[#f0f2f5] dark:bg-slate-900 border-gray-200 dark:border-gray-800"
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800"
      )}>
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-4xl">
          <ChatInput
            onSend={(content, language, script) => sendMessage.mutate({ content, language, script })}
            isLoading={sendMessage.isPending}
            chatStyle={chatStyle}
          />
          {!user?.isPremium && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
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