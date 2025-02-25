import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Mic, Loader2 } from "lucide-react";
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
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onSubmit={handleSubmit} 
      className="flex items-end gap-2 bg-white dark:bg-slate-900 p-4 border-t border-border backdrop-blur-lg"
    >
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2 flex-1 bg-background rounded-full px-4 py-2 border border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all duration-200 shadow-lg"
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-accent transition-colors duration-200"
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
      </motion.div>

      <AnimatePresence>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !message.trim()}
            className={cn(
              "h-10 w-10 rounded-full bg-gradient-to-r from-[#00a884] to-[#008f6f] hover:from-[#008f6f] hover:to-[#007a5f] transition-all duration-300 shadow-lg",
              message.trim() ? "scale-100" : "scale-95 opacity-90"
            )}
          >
            {isLoading ? (
              <motion.span 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5" />
              </motion.span>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
    </motion.form>
  );
}