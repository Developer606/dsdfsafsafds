import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type TypingIndicatorProps = {
  chatStyle?: "whatsapp" | "messenger" | "kakao" | "chatgpt";
};

export function TypingIndicator({ chatStyle = "whatsapp" }: TypingIndicatorProps) {
  // Define bubble effects based on chat style
  const bubbleStyles = {
    whatsapp: "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-md",
    messenger: "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-full",
    kakao: "bg-yellow-300 dark:bg-yellow-600 text-gray-800 dark:text-gray-100 rounded-md",
    chatgpt: "bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg",
  };

  // Define dot colors based on chat style
  const dotColors = {
    whatsapp: "bg-green-500",
    messenger: "bg-blue-500",
    kakao: "bg-black dark:bg-white",
    chatgpt: "bg-emerald-500",
  };

  return (
    <div className="flex gap-2 max-w-[80%] mr-auto">
      <div className="flex flex-col">
        <div className={cn("px-4 py-2", bubbleStyles[chatStyle])}>
          <div className="flex gap-1 items-center">
            <motion.div 
              className={cn("w-2 h-2 rounded-full", dotColors[chatStyle])}
              animate={{ y: [0, -5, 0] }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0 
              }}
            />
            <motion.div 
              className={cn("w-2.5 h-2.5 rounded-full", dotColors[chatStyle])}
              animate={{ y: [0, -6, 0] }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.1
              }}
            />
            <motion.div 
              className={cn("w-2 h-2 rounded-full", dotColors[chatStyle])}
              animate={{ y: [0, -5, 0] }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.2
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
