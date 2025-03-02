import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: Message;
  character: Character;
  chatStyle?: "whatsapp" | "chatgpt";
}

export function ChatMessage({ message, character, chatStyle = "whatsapp" }: ChatMessageProps) {
  const isUser = message.isUser;

  if (chatStyle === "chatgpt") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {message.content}
              </p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-2 max-w-[85%] relative"
    >
      <div className={cn(
        "flex flex-col",
        isUser ? "items-end ml-auto" : "items-start"
      )}>
        <div className={cn(
          "px-3 py-2 rounded-lg max-w-[90%]",
          isUser 
            ? "bg-[#e7ffdb] dark:bg-emerald-800 rounded-tr-none" 
            : "bg-white dark:bg-slate-800 rounded-tl-none"
        )}>
          {!isUser && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              {character.name}
            </p>
          )}
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {message.content}
          </p>
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