import { motion, AnimatePresence } from "framer-motion";
import { MessageStatusIndicator } from "./message-status-indicator";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MessageBubbleProps {
  id: number;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  isCurrentUser: boolean;
  hasDeliveryAnimation?: boolean;
  chatStyle?: "whatsapp" | "chatgpt" | "messenger";
  avatar?: string;
  userName?: string;
}

export function MessageBubble({
  id,
  content,
  timestamp,
  status,
  isCurrentUser,
  hasDeliveryAnimation = false,
  chatStyle = "whatsapp",
  avatar,
  userName
}: MessageBubbleProps) {
  // Format time string
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const bubbleVariants = {
    initial: { 
      opacity: 0,
      scale: 0.9,
      x: isCurrentUser ? 20 : -20
    },
    animate: { 
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  // ChatGPT style
  if (chatStyle === "chatgpt") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "py-8 px-4 md:px-6 w-full",
          isCurrentUser ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900"
        )}
      >
        <div className="flex gap-4 items-start max-w-3xl mx-auto">
          {!isCurrentUser && avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">
              {isCurrentUser ? "You" : userName}
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {content}
              </p>
              {isCurrentUser && (
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                    {formatTime(timestamp)}
                  </span>
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                </div>
              )}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">Y</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Messenger style
  if (chatStyle === "messenger") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isCurrentUser ? "justify-end" : "justify-start",
          "items-end gap-2"
        )}>
          {!isCurrentUser && avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "px-3 py-2 rounded-2xl max-w-full",
              isCurrentUser 
                ? "bg-[#0084ff] text-white" 
                : "bg-[#f0f0f0] dark:bg-slate-700 text-black dark:text-white"
            )}>
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {content}
              </p>
            </div>
            <div className="flex items-center mt-1 gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(timestamp)}
              </span>
              {isCurrentUser && (
                <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
              )}
            </div>
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
      transition={{ duration: 0.3 }}
      className={cn(
        "px-2 sm:px-4 py-1 sm:py-2",
        isCurrentUser ? "ml-auto" : "mr-auto",
        "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
      )}
    >
      <div className={cn(
        "flex flex-col",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg",
          isCurrentUser 
            ? "bg-[#e7ffdb] dark:bg-emerald-800 rounded-tr-none" 
            : "bg-white dark:bg-slate-800 rounded-tl-none",
          "max-w-full"
        )}>
          {!isCurrentUser && userName && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              {userName}
            </p>
          )}
          <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {content}
          </p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(timestamp)}
            </span>
            {isCurrentUser && (
              <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}