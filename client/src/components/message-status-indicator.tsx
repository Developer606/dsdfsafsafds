import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

interface MessageStatusIndicatorProps {
  status: "sent" | "delivered" | "read";
  animate?: boolean;
}

export function MessageStatusIndicator({ status, animate = true }: MessageStatusIndicatorProps) {
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  
  useEffect(() => {
    // Trigger animation only when status changes
    if (prevStatus !== status && animate) {
      setShowAnimation(true);
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    setPrevStatus(status);
  }, [status, prevStatus, animate]);

  // Define animations for different statuses
  const sentVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  };
  
  const deliveredVariants = {
    initial: { opacity: 0, x: -5 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };
  
  const readVariants = {
    initial: { color: "#94A3B8" },
    animate: { color: "#3B82F6", transition: { duration: 0.5 } }
  };

  return (
    <div className="inline-flex items-center ml-1">
      {status === "sent" && (
        <motion.div
          variants={sentVariants}
          initial={showAnimation ? "initial" : false}
          animate={showAnimation ? "animate" : false}
          className="text-gray-400 dark:text-gray-500"
        >
          <Check className="h-3 w-3" />
        </motion.div>
      )}
      
      {status === "delivered" && (
        <div className="relative">
          <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          <motion.div
            className="absolute -left-1 top-0"
            variants={deliveredVariants}
            initial={showAnimation ? "initial" : false}
            animate={showAnimation ? "animate" : false}
          >
            <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </motion.div>
        </div>
      )}
      
      {status === "read" && (
        <div className="relative">
          <Check className="h-3 w-3 text-blue-500 dark:text-blue-400" />
          <motion.div
            className="absolute -left-1 top-0"
            variants={readVariants}
            initial={showAnimation ? "initial" : false}
            animate={showAnimation ? "animate" : false}
          >
            <Check className="h-3 w-3 text-blue-500 dark:text-blue-400" />
          </motion.div>
        </div>
      )}
    </div>
  );
}