import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ChatMessageProps {
  message: Message;
  character: Character;
  chatStyle?: "whatsapp" | "chatgpt" | "messenger";
}

export function ChatMessage({ message, character, chatStyle = "whatsapp" }: ChatMessageProps) {
  const isUser = message.isUser;
  const [prevContent, setPrevContent] = useState(message.content);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  // Check if message is a partial progressive update
  const isPartialMessage = !isUser && 'isPartial' in message && message.isPartial === true;
  
  // Track content changes to animate updates
  useEffect(() => {
    if (message.content !== prevContent) {
      // Only animate if this is not the first time we're seeing this message
      if (prevContent) {
        setShouldAnimate(true);
        
        // Reset animation flag after animation completes
        const timer = setTimeout(() => {
          setShouldAnimate(false);
        }, 300);
        
        return () => clearTimeout(timer);
      }
      setPrevContent(message.content);
    }
  }, [message.content, prevContent]);

  if (chatStyle === "chatgpt") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: isPartialMessage ? 0.1 : 0.3,
          type: isPartialMessage ? "tween" : "spring" 
        }}
        className={cn(
          "py-8 px-4 md:px-6",
          isUser ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900"
        )}
      >
        <div className="container mx-auto max-w-3xl flex gap-4 items-start">
          {!isUser && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">
              {isUser ? "You" : character.name}
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <AnimatePresence mode="wait">
                <motion.p
                  key={message.content}
                  initial={shouldAnimate ? { opacity: 0.6 } : { opacity: 1 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-pre-wrap text-gray-800 dark:text-gray-200"
                >
                  {message.content}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          {isUser && (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">Y</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (chatStyle === "messenger") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: isPartialMessage ? 0.1 : 0.3,
          type: isPartialMessage ? "tween" : "spring" 
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2",
          isUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isUser ? "justify-end" : "justify-start",
          "items-end gap-2"
        )}>
          {!isUser && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isUser ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "px-3 py-2 rounded-2xl max-w-full",
              isUser 
                ? "bg-[#0084ff] text-white" 
                : "bg-[#f0f0f0] dark:bg-slate-700 text-black dark:text-white"
            )}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={message.content}
                  initial={shouldAnimate ? { opacity: 0.6 } : { opacity: 1 }}
                  animate={{ opacity: 1 }}
                  className="text-sm sm:text-base whitespace-pre-wrap break-words"
                >
                  {message.content}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(message.timestamp), "h:mm a")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // WhatsApp style (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // For progressive updates, use a faster transition
      transition={{ 
        duration: isPartialMessage ? 0.1 : 0.3,
        type: isPartialMessage ? "tween" : "spring" 
      }}
      className={cn(
        "px-2 sm:px-4 py-1 sm:py-2",
        isUser ? "ml-auto" : "mr-auto",
        "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
      )}
    >
      <div className={cn(
        "flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg",
          isUser 
            ? "bg-[#e7ffdb] dark:bg-emerald-800 rounded-tr-none" 
            : "bg-white dark:bg-slate-800 rounded-tl-none",
          "max-w-full"
        )}>
          {!isUser && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              {character.name}
            </p>
          )}
          <AnimatePresence mode="wait">
            <motion.p
              key={message.content}
              initial={shouldAnimate ? { opacity: 0.6 } : { opacity: 1 }}
              animate={{ opacity: 1 }}
              className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words"
            >
              {message.content}
            </motion.p>
          </AnimatePresence>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(message.timestamp), "h:mm a")}
            </span>
            {isUser && (
              <div className="flex">
                <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <Check className="h-3 w-3 -ml-1 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}