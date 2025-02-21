import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setMessage(prevMsg => prevMsg + emojiObject.emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-background p-2 rounded-lg border">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            size="icon" 
            variant="ghost"
            className="h-10 w-10 shrink-0"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 w-full" 
          side="top" 
          align="start"
        >
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </PopoverContent>
      </Popover>

      <Button 
        type="button" 
        size="icon" 
        variant="ghost"
        className="h-10 w-10 shrink-0"
      >
        <Paperclip className="h-5 w-5 text-muted-foreground" />
      </Button>

      <div className="flex-1">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          disabled={isLoading}
          className="min-h-10 w-full"
        />
      </div>

      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || !message.trim()}
        className="h-10 w-10 shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}