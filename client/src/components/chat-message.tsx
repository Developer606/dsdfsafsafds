import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: Message;
  character: Character;
}

export function ChatMessage({ message, character }: ChatMessageProps) {
  const isUser = message.isUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "w-full border-b border-gray-100 dark:border-gray-800",
        isUser ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900"
      )}
    >
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex gap-4 items-start">
          {!isUser && (
            <motion.img
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={character.avatar}
              alt={character.name}
              className="w-8 h-8 rounded-full object-cover mt-1"
            />
          )}
          <div className={cn("flex flex-col flex-1", isUser && "items-end")}>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 dark:text-gray-400 mb-1"
            >
              {isUser ? "You" : character.name}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="prose dark:prose-invert max-w-none"
            >
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {message.content}
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-2 text-xs text-gray-400"
            >
              {format(new Date(message.timestamp), "h:mm a")}
              {isUser && (
                <div className="flex">
                  <Check className="h-3 w-3" /> 
                  <Check className="h-3 w-3 -ml-2" />
                </div>
              )}
            </motion.div>
          </div>
          {isUser && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
            >
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                {isUser ? "Y" : character.name[0]}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}