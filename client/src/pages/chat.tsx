import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2, MessageCircle, Sun, Moon, Layout } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionManagement } from "@/components/subscription-management";
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


export default function Chat() {
  const { characterId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const tempMessageIdRef = useRef<string>("");
  const [chatTheme, setChatTheme] = useState<'whatsapp' | 'chatgpt'>('whatsapp');

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

  const { data: characters } = useQuery<Character[]>({
    queryKey: ["/api/characters"]
  });

  const character = characters?.find((c: Character) => c.id === characterId);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

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
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/chats")}
            className="text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-3">
            <img
              src={character?.avatar}
              alt={character?.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <h2 className="font-medium text-gray-800 dark:text-gray-200">
              {character?.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {user?.isPremium && (user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'pro') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Layout className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setChatTheme('whatsapp')}
                    className={chatTheme === 'whatsapp' ? 'bg-accent' : ''}
                  >
                    WhatsApp Style
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setChatTheme('chatgpt')}
                    className={chatTheme === 'chatgpt' ? 'bg-accent' : ''}
                  >
                    ChatGPT Style
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            {user && <SubscriptionManagement user={user} />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFeedbackDialog(true)}
              className="h-9 w-9 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="h-9 w-9 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-16 pb-20">
        <div className="container mx-auto max-w-4xl">
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
                  theme={chatTheme}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto max-w-4xl p-4">
          <ChatInput
            onSend={(content, language, script) => sendMessage.mutate({ content, language, script })}
            isLoading={sendMessage.isPending}
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