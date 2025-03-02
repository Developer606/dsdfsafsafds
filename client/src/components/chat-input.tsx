import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Loader2 } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.form 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit} 
      className="relative"
    >
      <div className="relative flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Smile className="h-5 w-5 text-gray-500 dark:text-gray-400" />
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
          placeholder="Send a message..."
          disabled={isLoading}
          className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-base py-6"
        />

        <Button 
          type="submit" 
          size="icon"
          disabled={isLoading || !message.trim()}
          className={cn(
            "h-10 w-10 rounded-full mr-2",
            "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
            "transition-all duration-200",
            !message.trim() && "opacity-50"
          )}
        >
          {isLoading ? (
            <motion.span 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-5 w-5 text-white" />
            </motion.span>
          ) : (
            <Send className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>
    </motion.form>
  );
}