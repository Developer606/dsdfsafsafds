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
        "w-full",
        theme === 'whatsapp' ? (
          "border-b border-gray-100 dark:border-gray-800"
        ) : (
          "py-8 first:pt-0 last:pb-0"
        ),
        theme === 'whatsapp' ? (
          isUser ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900"
        ) : ""
      )}
    >
      <div className={cn(
        "container mx-auto",
        theme === 'whatsapp' ? "max-w-4xl px-4 py-6" : "max-w-2xl px-4"
      )}>
        <div className={cn(
          "flex gap-4",
          theme === 'chatgpt' && "items-start",
          theme === 'whatsapp' && isUser && "flex-row-reverse"
        )}>
          {theme === 'whatsapp' ? (
            isUser ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
              >
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                  {isUser ? "Y" : character.name[0]}
                </span>
              </motion.div>
            ) : (
              <motion.img
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={character.avatar}
                alt={character.name}
                className="w-8 h-8 rounded-full object-cover mt-1"
              />
            )
          ) : (
            <motion.img
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={isUser ? "/images/user-avatar.png" : character.avatar}
              alt={isUser ? "You" : character.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}

          <div className={cn(
            "flex flex-col flex-1",
            theme === 'whatsapp' && isUser && "items-end"
          )}>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "text-sm",
                theme === 'whatsapp' ? (
                  "text-gray-500 dark:text-gray-400 mb-1"
                ) : (
                  "font-medium text-gray-700 dark:text-gray-300 mb-1"
                )
              )}
            >
              {isUser ? "You" : character.name}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "prose dark:prose-invert max-w-none",
                theme === 'whatsapp' && isUser && "text-right"
              )}
            >
              <div className={cn(
                "whitespace-pre-wrap",
                theme === 'whatsapp' ? (
                  isUser ? (
                    "bg-blue-500 text-white px-4 py-2 rounded-lg inline-block"
                  ) : (
                    "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg inline-block"
                  )
                ) : (
                  "text-gray-800 dark:text-gray-200"
                )
              )}>
                {message.content}
              </div>
            </motion.div>
            {theme === 'whatsapp' && (
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
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}