import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Mic, Loader2 } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedLanguages } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string, language: string, script?: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("english");
  const [script, setScript] = useState<"devanagari" | "latin">("devanagari");
  const [showScriptSelector, setShowScriptSelector] = useState(false);

  useEffect(() => {
    setShowScriptSelector(language === "hindi");
    if (language !== "hindi") {
      setScript("devanagari");
    }
  }, [language]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message, language, language === "hindi" ? script : undefined);
      setMessage("");
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setMessage(prevMsg => prevMsg + emojiObject.emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white dark:bg-slate-900 p-4 border-t border-border">
      <div className="flex items-center gap-2 flex-1 bg-background rounded-full px-4 py-2 border border-input focus-within:ring-1 focus-within:ring-ring"> 
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-accent"
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

        <Select
          value={language}
          onValueChange={setLanguage}
        >
          <SelectTrigger className="w-[100px] h-8 border-0 focus:ring-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map((lang) => (
              <SelectItem key={lang.id} value={lang.id}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          disabled={isLoading}
          className="flex-1 border-0 focus-visible:ring-0 bg-transparent px-0"
        />
      </div>

      <Button 
        type="submit" 
        size="icon"
        disabled={isLoading || !message.trim()}
        className={cn(
          "h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#00946e] transition-all duration-200",
          message.trim() ? "scale-100" : "scale-95 opacity-90"
        )}
      >
        {isLoading ? (
          <span className="animate-spin">
            <Loader2 className="h-5 w-5" />
          </span>
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}