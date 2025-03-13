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
      "/images/background/bg1.svg",
      "/images/background/bg2.svg",
      "/images/background/bg3.svg",
      "/images/background/bg4.svg",
      "/images/background/bg5.svg",
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
          initial={{ opacity: 0 }}
          animate={{ opacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ 
            backgroundImage: `url(${backgrounds[currentIndex]})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
      </AnimatePresence>
      
      {/* Add a gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
    </div>
  );
}