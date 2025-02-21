import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Button } from "@/components/ui/button";
import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
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
        userId: 1,
        characterId: characterId || "",
        content,
        isUser: true,
        timestamp: new Date()
      };

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
          const filteredOld = old.filter(msg => typeof msg.id === 'number');
          return [...filteredOld, ...newMessages];
        }
      );
    },
    onError: () => {
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

  if (!character) return null;

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center p-4 bg-gray-900/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/chats")}
          className="text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="ml-4">
          <h2 className="font-semibold text-white">{character.name}</h2>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-black">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800/50 animate-pulse rounded-lg" />
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

      {/* Input area */}
      <div className="p-4 bg-gray-900/50 backdrop-blur-sm">
        <ChatInput
          onSend={(content) => sendMessage.mutate(content)}
          isLoading={sendMessage.isPending}
        />
      </div>
    </div>
  );
}