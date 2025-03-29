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
  chatStyle?: "whatsapp" | "chatgpt" | "messenger" | "kakaotalk";
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
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30, 
          duration: 0.4 
        }}
        className={cn(
          "py-6 px-4 md:px-8 w-full border-b",
          isCurrentUser 
            ? "bg-white dark:bg-slate-800/90 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200" 
            : "bg-gray-50 dark:bg-slate-900/90 border-gray-100 dark:border-slate-700 hover:bg-gray-100/50 dark:hover:bg-slate-900 transition-colors duration-200"
        )}
      >
        <div className="flex gap-4 items-start max-w-3xl mx-auto">
          {!isCurrentUser && (
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-purple-200 dark:ring-purple-800 shadow-md">
              {avatar ? (
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center">
              {isCurrentUser ? "You" : (userName || "Assistant")}
              {!isCurrentUser && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-sm">
                  AI Assistant
                </span>
              )}
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed text-base">
                {content}
              </p>
              {isCurrentUser && (
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5">
                    {formatTime(timestamp)}
                  </span>
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                </div>
              )}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-sm font-medium text-white">You</span>
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
        transition={{ 
          type: "spring", 
          stiffness: 380, 
          damping: 25 
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-1.5",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isCurrentUser ? "justify-end" : "justify-start",
          "items-end gap-2"
        )}>
          {!isCurrentUser && (
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 border-blue-100 dark:border-blue-900">
              {avatar ? (
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start"
          )}>
            {!isCurrentUser && userName && (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1.5">
                {userName}
              </span>
            )}
            <div className={cn(
              "px-4 py-2.5 rounded-3xl max-w-full",
              isCurrentUser 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 dark:shadow-blue-900/30" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
            )}>
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </p>
            </div>
            <div className="flex items-center mt-1 gap-1.5 px-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(timestamp)}
              </span>
              {isCurrentUser && (
                <div className="flex items-center">
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                  {status === "read" && (
                    <div className="w-4 h-4 rounded-full overflow-hidden ml-1 border border-blue-100 dark:border-blue-800">
                      {avatar ? (
                        <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 dark:bg-blue-900"></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // KakaoTalk style
  if (chatStyle === "kakaotalk") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-2",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isCurrentUser ? "justify-end" : "justify-start",
          "items-end gap-2.5"
        )}>
          {!isCurrentUser && (
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 shadow-md border-2 border-pink-200 dark:border-pink-900">
              {avatar ? (
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-300 to-pink-200 text-pink-800">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start"
          )}>
            {!isCurrentUser && userName && (
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1.5">
                {userName}
              </span>
            )}
            <div className={cn(
              "py-2.5 px-4 max-w-full shadow-sm",
              isCurrentUser 
                ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-3xl rounded-tr-sm" 
                : "bg-white text-gray-800 dark:bg-gray-100 dark:text-gray-800 rounded-3xl rounded-tl-sm border border-gray-100"
            )}>
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </p>
            </div>
            <div className="flex items-center mt-1 gap-1 px-1">
              <span className="text-[10px] text-gray-500 font-medium">
                {isCurrentUser ? (
                  <>
                    <span className="text-pink-700 dark:text-pink-400 mr-0.5">{status === "read" ? "읽음" : status === "delivered" ? "전달됨" : "보냄"}</span>
                    {formatTime(timestamp)}
                  </>
                ) : (
                  <>오후 {formatTime(timestamp)}</>
                )}
              </span>
              {isCurrentUser && (
                <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
              )}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-7 h-7 flex-shrink-0 relative -mr-1">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="18" cy="18" r="18" fill="#FFEB3B" />
                <circle cx="12" cy="15" r="2" fill="#000000" />
                <circle cx="24" cy="15" r="2" fill="#000000" />
                <path d="M11 22C14 25 22 25 25 22" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // WhatsApp style (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 420, 
        damping: 28
      }}
      className={cn(
        "px-2 sm:px-4 py-1 sm:py-2 mb-1",
        isCurrentUser ? "ml-auto" : "mr-auto",
        "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
      )}
    >
      <div className={cn(
        "flex",
        isCurrentUser ? "justify-end" : "justify-start",
        "items-end gap-2"
      )}>
        {!isCurrentUser && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-2 ring-green-100 dark:ring-green-900">
            {avatar ? (
              <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-800">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
        )}
        <div className={cn(
          "flex flex-col",
          isCurrentUser ? "items-end" : "items-start"
        )}>
          {!isCurrentUser && userName && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1.5">
              {userName}
            </span>
          )}
          <div className={cn(
            "px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-sm relative",
            isCurrentUser 
              ? "bg-gradient-to-br from-[#dcf8c6] to-[#e7ffdb] dark:from-emerald-700 dark:to-emerald-800 rounded-tr-md border border-green-100 dark:border-emerald-600" 
              : "bg-white dark:bg-slate-800 rounded-tl-md border border-gray-100 dark:border-slate-700",
            "max-w-full"
          )}>
            {/* WhatsApp-style bubble tail */}
            <div className={cn(
              "absolute top-0 w-3 h-3 overflow-hidden",
              isCurrentUser ? "-right-2" : "-left-2"
            )}>
              <div className={cn(
                "absolute transform rotate-45 w-4 h-4 border",
                isCurrentUser 
                  ? "bg-[#dcf8c6] dark:bg-emerald-800 -top-2 -left-2 border-green-100 dark:border-emerald-600" 
                  : "bg-white dark:bg-slate-800 -top-2 -right-2 border-gray-100 dark:border-slate-700"
              )}></div>
            </div>
            
            <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {formatTime(timestamp)}
              </span>
              {isCurrentUser && (
                <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}