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
        characterId: characterId || "",
        content,
        isUser: true,
        createdAt: new Date().toISOString()
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
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img
          src={character.avatar}
          alt={character.name}
          className="w-10 h-10 rounded-full mx-4"
        />
        <div>
          <h2 className="font-semibold">{character.name}</h2>
          <p className="text-sm text-muted-foreground">{character.description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => clearChat.mutate()}
          disabled={clearChat.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-card animate-pulse rounded-lg" />
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

      <div className="p-4 border-t">
        <ChatInput
          onSend={(content) => sendMessage.mutate(content)}
          isLoading={sendMessage.isPending}
        />
      </div>
    </div>
  );
}