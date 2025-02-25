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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "flex gap-3 max-w-[80%] group",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {!isUser && (
        <motion.img
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
          src={character.avatar}
          alt={character.name}
          className="w-8 h-8 rounded-full object-cover mt-1"
        />
      )}
      <div className="flex flex-col">
        {!isUser && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-muted-foreground mb-1"
          >
            {character.name}
          </motion.span>
        )}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={cn(
            "px-4 py-2 rounded-2xl text-sm relative break-words shadow-lg hover:shadow-xl transition-shadow",
            isUser
              ? "bg-[#00a884] text-white rounded-br-none bg-gradient-to-br from-[#00a884] to-[#008f6f]" 
              : "bg-white text-gray-800 rounded-bl-none dark:bg-slate-800 dark:text-white"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "text-[11px] flex items-center gap-1 mt-1",
              isUser ? "text-white/70" : "text-gray-500"
            )}
          >
            {format(new Date(message.timestamp), "h:mm a")}
            {isUser && (
              <div className="flex ml-1">
                <Check className="h-3 w-3" /> 
                <Check className="h-3 w-3 -ml-2" />
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}