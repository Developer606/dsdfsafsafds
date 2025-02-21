import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Globe2, Type } from "lucide-react";
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

      <Select
        value={language}
        onValueChange={setLanguage}
      >
        <SelectTrigger className="w-[140px]">
          <Globe2 className="h-4 w-4 mr-2" />
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

      {showScriptSelector && (
        <Select
          value={script}
          onValueChange={(value) => setScript(value as "devanagari" | "latin")}
        >
          <SelectTrigger className="w-[140px]">
            <Type className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(supportedLanguages.find(lang => lang.id === "hindi") as any).scripts.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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