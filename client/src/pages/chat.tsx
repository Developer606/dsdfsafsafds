import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Message, FREE_USER_MESSAGE_LIMIT } from "@shared/schema";
import { type Character } from "@shared/characters";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Trash2, LogOut, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { type User } from "@shared/schema";


export default function Chat() {
  const { characterId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const tempMessageIdRef = useRef<string>("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        throw new Error("Message limit reached. Upgrade to premium to send more messages.");
      }

      const tempId = Date.now();
      tempMessageIdRef.current = tempId.toString();

      const userMessage: Message = {
        id: tempId,
        content,
        isUser: true,
        timestamp: new Date(),
        characterId,
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message"
      });
    }
  });

  if (!character) return null;

  return (
    <div className="flex flex-col h-screen bg-[#efeae2] dark:bg-slate-950">
      <div className="flex items-center px-4 py-2 bg-[#00a884] dark:bg-slate-900 text-white shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/chats")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center flex-1 min-w-0">
          <img
            src={character?.avatar}
            alt={character?.name}
            className="w-10 h-10 rounded-full object-cover mx-3"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{character?.name}</h2>
            <p className="text-sm text-white/80">
              {isTyping ? "typing..." : "online"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFeedbackDialog(true)}
            className="text-white hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="text-white hover:bg-white/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          {!user?.isPremium && (
            <div className="text-sm text-white/80">
              {remainingMessages} messages remaining
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundColor: "#efeae2",
        }}
      >
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-white/50 dark:bg-white/5 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            {messages.map((message: Message) => (
              <ChatMessage
                key={message.id}
                message={message}
                character={character}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={(content, language, script) => sendMessage.mutate({ content, language, script })}
        isLoading={sendMessage.isPending}
      />

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
    </div>
  );
}