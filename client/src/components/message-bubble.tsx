import { motion, AnimatePresence } from "framer-motion";
import { MessageStatusIndicator } from "./message-status-indicator";

interface MessageBubbleProps {
  id: number;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  isCurrentUser: boolean;
  hasDeliveryAnimation?: boolean;
}

export function MessageBubble({
  id,
  content,
  timestamp,
  status,
  isCurrentUser,
  hasDeliveryAnimation = false
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

  return (
    <motion.div
      layout
      key={id}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={bubbleVariants}
      className={`flex max-w-[75%] ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}
    >
      <div 
        className={`
          ${isCurrentUser 
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-tl-2xl rounded-tr-md rounded-bl-2xl' 
            : 'bg-white dark:bg-gray-800 rounded-tl-md rounded-tr-2xl rounded-br-2xl shadow-sm'}
        `}
      >
        <div className="p-3">
          <p>{content}</p>
          <div className={`text-xs mt-1 flex items-center justify-end ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
            <span>{formatTime(timestamp)}</span>
            
            {isCurrentUser && (
              <AnimatePresence mode="wait">
                <MessageStatusIndicator key={`${id}-${status}`} status={status} animate={hasDeliveryAnimation} />
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}