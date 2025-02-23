import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { characterId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const tempMessageIdRef = useRef<string>("");

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

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, language, script }: { content: string; language: string; script?: string }) => {
      // Generate a unique temporary ID
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      tempMessageIdRef.current = tempId;

      // First, optimistically add the user's message
      const userMessage: Message = {
        id: tempId,
        content,
        isUser: true,
        timestamp: new Date(),
        characterId,
        userId: 0, // Will be set by server
        language,
        script
      };

      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => [...old, userMessage]
      );

      // Show typing indicator
      setIsTyping(true);
      scrollToBottom();

      // Send the actual request
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

      // Simulate typing delay before showing bot response
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);

      return res.json();
    },
    onSuccess: (newMessages: Message[]) => {
      // Update with the actual response from the server
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => {
          // Remove the temporary message
          const filtered = old.filter(msg => msg.id !== tempMessageIdRef.current);
          // Add the actual messages from the server
          return [...filtered, ...newMessages];
        }
      );
      scrollToBottom();
      tempMessageIdRef.current = ""; // Clear the temp ID
    },
    onError: () => {
      setIsTyping(false);
      // Remove the temporary message on error
      queryClient.setQueryData<Message[]>(
        [`/api/messages/${characterId}`],
        (old = []) => old.filter(msg => msg.id !== tempMessageIdRef.current)
      );
      tempMessageIdRef.current = ""; // Clear the temp ID
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  });

  if (!character) return null;

  return (
    <div className="flex flex-col h-screen bg-[#efeae2]">
      <div className="flex items-center px-4 py-2 bg-[#075e54] text-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/chats")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <img
          src={character.avatar}
          alt={character.name}
          className="w-10 h-10 rounded-full mx-3"
        />
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{character.name}</h2>
          <p className="text-sm text-white/80">
            {isTyping ? "typing..." : "online"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <MoreVertical className="h-6 w-6" />
        </Button>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundColor: "#efeae2"
        }}
      >
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white/50 animate-pulse rounded-lg" />
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

      <div className="p-2 bg-[#f0f2f5]">
        <ChatInput
          onSend={(content, language, script) => sendMessage.mutate({ content, language, script })}
          isLoading={sendMessage.isPending}
        />
      </div>
    </div>
  );
}