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
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
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
    
    // Preload all images before setting them
    const imagePromises = bgImages.map(src => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = () => {
          console.error(`Failed to load image: ${src}`);
          reject(new Error(`Failed to load image: ${src}`));
        };
      });
    });
    
    Promise.all(imagePromises)
      .then(loadedImages => {
        setBackgrounds(loadedImages);
        setImagesLoaded(true);
        console.log("All background images loaded successfully");
      })
      .catch(error => {
        console.error("Error loading background images:", error);
        // Set at least the first image if available
        if (bgImages.length > 0) {
          setBackgrounds([bgImages[0]]);
          setImagesLoaded(true);
        }
      });
  }, []);
  
  // Rotate through backgrounds at specified interval
  useEffect(() => {
    if (backgrounds.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [backgrounds, interval]);
  
  if (!imagesLoaded || backgrounds.length === 0) {
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