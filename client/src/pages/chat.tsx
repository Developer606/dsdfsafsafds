import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Button } from "@/components/ui/button";
import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { characterId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: characters } = useQuery<Character[]>({ 
    queryKey: ["/api/characters"]
  });

  const character = characters?.find((c: Character) => c.id === characterId);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({ 
    queryKey: [`/api/messages/${characterId}`],
    enabled: !!characterId
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const optimisticId = Date.now();
      const optimisticMessage: Message = {
        id: optimisticId,
        userId: 1, // Add required userId
        characterId: characterId || "",
        content,
        isUser: true,
        timestamp: new Date() // Use timestamp instead of createdAt
      };

      // Add optimistic message
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => [...old, optimisticMessage]
      );

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          content,
          isUser: true
        })
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (newMessages: Message[]) => {
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => {
          // Remove optimistic message and add real messages
          const filteredOld = old.filter(msg => typeof msg.id === 'number');
          return [...filteredOld, ...newMessages];
        }
      );
    },
    onError: () => {
      // Remove optimistic message on error
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => old.filter(msg => typeof msg.id === 'number')
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!characterId) throw new Error("No character ID");
      const res = await fetch(`/api/messages/${characterId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to clear chat");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData([`/api/messages/${characterId}`], []);
      toast({
        title: "Success",
        description: "Chat history cleared"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history"
      });
    }
  });

  if (!character) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* WhatsApp-style header */}
      <div className="flex items-center p-4 border-b bg-card shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/chats")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center flex-1 min-w-0">
          <img
            src={character.avatar}
            alt={character.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="ml-3 flex-1 min-w-0">
            <h2 className="font-semibold truncate">{character.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{character.description}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-2"
          onClick={() => clearChat.mutate()}
          disabled={clearChat.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat messages area with WhatsApp-style background */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='rgba(0,0,0,0.03)' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px'
        }}
      >
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-card/50 animate-pulse rounded-lg" />
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
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Fixed input area at bottom */}
      <div className="p-4 border-t bg-background">
        <ChatInput
          onSend={(content) => sendMessage.mutate(content)}
          isLoading={sendMessage.isPending}
        />
      </div>
    </div>
  );
}