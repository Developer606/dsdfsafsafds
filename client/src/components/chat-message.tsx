import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: Message;
  character: Character;
  theme?: 'whatsapp' | 'chatgpt';
}

export function ChatMessage({ message, character, theme = 'whatsapp' }: ChatMessageProps) {
  const isUser = message.isUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "w-full px-4 py-1",
        theme === 'whatsapp' ? "mb-1" : "py-8 first:pt-0 last:pb-0"
      )}
    >
      <div className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        "max-w-[75%]",
        isUser ? "ml-auto" : "mr-auto"
      )}>
        <div className={cn(
          "relative px-3 py-2 rounded-lg",
          theme === 'whatsapp' ? (
            isUser ? (
              "bg-[#e7ffdb] dark:bg-[#025c4c] text-black dark:text-white"
            ) : (
              "bg-white dark:bg-[#202c33] text-black dark:text-white"
            )
          ) : (
            "bg-transparent text-gray-800 dark:text-gray-200"
          ),
          "shadow-sm"
        )}>
          {theme === 'whatsapp' && (
            <div className={cn(
              "absolute top-0 w-4 h-4 overflow-hidden",
              isUser ? "-right-2" : "-left-2",
            )}>
              <div className={cn(
                "absolute w-4 h-4 transform rotate-45",
                isUser ? (
                  "bg-[#e7ffdb] dark:bg-[#025c4c] -left-2 top-1"
                ) : (
                  "bg-white dark:bg-[#202c33] -right-2 top-1"
                )
              )} />
            </div>
          )}

          <div className="whitespace-pre-wrap min-w-[120px]">
            {message.content}
          </div>

          {theme === 'whatsapp' && (
            <div className={cn(
              "text-[0.65rem] mt-1",
              isUser ? (
                "text-[#75b977] dark:text-[#7db39c]"
              ) : (
                "text-gray-500 dark:text-gray-400"
              ),
              "flex items-center gap-1 justify-end"
            )}>
              {format(new Date(message.timestamp), "HH:mm")}
              {isUser && (
                <div className="flex -ml-1">
                  <Check className="h-3 w-3" />
                  <Check className="h-3 w-3 -ml-2" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}