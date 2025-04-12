import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { CharacterSticker } from "./character-sticker";

interface EmotionInfo {
  emoji: string;
  originalText: string;
  category: string;
}

interface ChatMessageProps {
  message: Message;
  character: Character;
  chatStyle?: "whatsapp" | "chatgpt" | "messenger";
}

export function ChatMessage({ message, character, chatStyle = "whatsapp" }: ChatMessageProps) {
  const isUser = message.isUser;
  
  // Parse the metadata to extract emotion information
  const getEmotionData = (): EmotionInfo | null => {
    if (!message.metadata || isUser) return null;
    
    try {
      // If metadata is a string, try to parse it as JSON
      const metadataObj = typeof message.metadata === 'string' 
        ? JSON.parse(message.metadata) 
        : message.metadata;
      
      // Check if emotions data exists
      if (metadataObj?.emotions) {
        // Handle emotions as a string that needs further parsing
        const emotionsData = typeof metadataObj.emotions === 'string'
          ? JSON.parse(metadataObj.emotions)
          : metadataObj.emotions;
        
        // Return the first emotion if available
        if (Array.isArray(emotionsData) && emotionsData.length > 0) {
          return emotionsData[0];
        }
      }
    } catch (error) {
      console.error("Error parsing message metadata:", error);
    }
    
    return null;
  };
  
  // Get emotion data for this message
  const emotionData = getEmotionData();

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
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
              
              {/* Add character sticker for chatgpt style */}
              {emotionData && (
                <div className="absolute -right-3 -bottom-3 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-200 dark:border-slate-700">
                  <span className="text-xl">{emotionData.emoji}</span>
                </div>
              )}
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

  if (chatStyle === "messenger") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
              
              {/* Add emoji reaction for messenger style */}
              {emotionData && (
                <div className="absolute -right-2 -bottom-2 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <span className="text-sm">{emotionData.emoji}</span>
                </div>
              )}
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
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {message.content}
              </p>
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
      transition={{ duration: 0.3 }}
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
          "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg relative",
          isUser 
            ? "bg-[#e7ffdb] dark:bg-emerald-800 rounded-tr-none" 
            : "bg-white dark:bg-slate-800 rounded-tl-none",
          "max-w-full"
        )}>
          {/* Add character sticker for non-user messages with emotion data */}
          {!isUser && emotionData && (
            <CharacterSticker 
              emoji={emotionData.emoji}
              emotion={emotionData.originalText}
              character={character}
              size="small"
              position="top"
            />
          )}
          
          {!isUser && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              {character.name}
            </p>
          )}
          <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
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