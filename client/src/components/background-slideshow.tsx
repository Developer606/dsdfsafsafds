import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BackgroundSlideshowProps {
  className?: string;
  interval?: number; // Time in milliseconds between transitions
  opacity?: number; // Opacity of the background images
}

export function BackgroundSlideshow({
  className = "",
  interval = 8000, // Default to 8 seconds per image
  opacity = 0.25, // Default opacity
}: BackgroundSlideshowProps) {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Load background images when component mounts
  useEffect(() => {
    const bgImages = [
      "/images/background/image.webp",
      "/images/background/image (1).webp",
      "/images/background/image (2).webp",
      "/images/background/image (3).webp",
      "/images/background/image (4).webp",
      "/images/background/image (5).webp",
    ];
    setBackgrounds(bgImages);
  }, []);
  
  // Rotate through backgrounds at specified interval
  useEffect(() => {
    if (backgrounds.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [backgrounds, interval]);
  
  if (backgrounds.length === 0) {
    return null; // Don't render anything until backgrounds are loaded
  }
  
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ 
            duration: 2, 
            ease: "easeInOut",
            scale: {
              duration: 8,
            }
          }}
          className="absolute inset-0"
          style={{ 
            backgroundImage: `url(${backgrounds[currentIndex]})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
      </AnimatePresence>
      
      {/* Add a gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFFDFA]/70 to-[#FFFDFA] dark:via-slate-950/70 dark:to-slate-950" />
    </div>
  );
}