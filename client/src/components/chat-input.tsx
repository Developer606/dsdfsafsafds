import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import { StickerIcon } from "lucide-react"; // Renamed to avoid conflict
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
import { supportedLanguages, type Sticker as StickerType } from "@shared/schema"; // Renamed to avoid conflict
import { StickerPicker } from "./sticker-picker";

interface ChatInputProps {
  onSend: (content: string, language: string, script?: string, messageType?: 'text' | 'emoji' | 'sticker', stickerId?: string) => void;
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
      onSend(message, language, language === "hindi" ? script : undefined, 'text');
      setMessage("");
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    if (message.length > 0) {
      setMessage(prevMsg => prevMsg + emojiObject.emoji);
    } else {
      onSend(emojiObject.emoji, language, undefined, 'emoji');
    }
  };

  const onStickerSelect = (sticker: StickerType) => {
    onSend('', language, undefined, 'sticker', sticker.id);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex items-center gap-2 flex-1 bg-white rounded-full px-4 py-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <Smile className="h-5 w-5 text-gray-500" />
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

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <StickerIcon className="h-5 w-5 text-gray-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0" 
            side="top" 
            align="start"
          >
            <StickerPicker onStickerSelect={onStickerSelect} />
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
        className="h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#00946e]"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}