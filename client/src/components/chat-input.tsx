import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, Loader2 } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { motion } from "framer-motion";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  chatStyle?: "whatsapp" | "chatgpt" | "messenger";
}

export function ChatInput({ onSend, isLoading, chatStyle = "whatsapp" }: ChatInputProps) {
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
    <motion.form 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit} 
      className="relative"
    >
      <div className={cn(
        "relative flex items-center gap-2 rounded-lg border shadow-lg",
        chatStyle === "whatsapp" 
          ? "bg-white dark:bg-slate-800 border-[#f0f2f5] dark:border-gray-700 p-1" 
          : chatStyle === "messenger"
          ? "bg-white dark:bg-slate-800 border-[#eee] dark:border-gray-700 p-1.5"
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 p-1"
      )}>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-200",
                chatStyle === "whatsapp"
                  ? "hover:bg-gray-100 dark:hover:bg-slate-700 text-[#00a884] dark:text-[#00a884]/90"
                  : chatStyle === "messenger"
                  ? "hover:bg-gray-100 dark:hover:bg-slate-700 text-[#0084ff] dark:text-[#0084ff]/90"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
              )}
            >
              <Smile className="h-5 w-5" />
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

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={chatStyle === "whatsapp" 
            ? "Type a message..." 
            : chatStyle === "messenger" 
            ? "Type a message..." 
            : "Send a message..."}
          disabled={isLoading}
          className={cn(
            "flex-1 border-0 focus-visible:ring-0 bg-transparent text-base py-6 pl-1 transition-all duration-300",
            chatStyle === "whatsapp"
              ? "placeholder:text-gray-500 placeholder:text-opacity-70"
              : chatStyle === "messenger"
              ? "placeholder:text-[#0084ff]/40 dark:placeholder:text-[#0084ff]/30"
              : "placeholder:text-gray-400"
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
              e.preventDefault();
              onSend(message);
              setMessage("");
            }
          }}
        />

        <Button 
          type="submit" 
          size="icon"
          disabled={isLoading || !message.trim()}
          className={cn(
            "h-10 w-10 rounded-full mr-2 shadow-sm",
            chatStyle === "whatsapp"
              ? "bg-[#00a884] hover:bg-[#00a884]/90 dark:bg-[#00a884] dark:hover:bg-[#00a884]/90"
              : chatStyle === "messenger"
              ? "bg-[#0084ff] hover:bg-[#0084ff]/90 dark:bg-[#0084ff] dark:hover:bg-[#0084ff]/90"
              : "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
            "transition-all duration-200 transform hover:scale-105 active:scale-95",
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
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: message.trim() ? 1 : 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Send className="h-5 w-5 text-white" />
            </motion.span>
          )}
        </Button>
      </div>
    </motion.form>
  );
}