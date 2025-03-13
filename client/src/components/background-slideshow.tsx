import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundSlideshowProps {
  interval?: number; // Time in ms between transitions
  opacity?: number; // Opacity of the images
  fadeTime?: number; // Transition duration in seconds
  darkMode?: boolean; // Whether to use dark mode overlay
}

export function BackgroundSlideshow({
  interval = 5000,
  opacity = 0.15,
  fadeTime = 2,
  darkMode = false,
}: BackgroundSlideshowProps) {
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of background images from the folder
  useEffect(() => {
    async function fetchBackgroundImages() {
      try {
        // This is a simple implementation - in a real app, you'd want to
        // create an API endpoint to get the list of images from the server
        const response = await fetch('/api/background-images');
        if (!response.ok) {
          throw new Error('Failed to fetch background images');
        }
        
        const imageList = await response.json();
        
        if (Array.isArray(imageList) && imageList.length > 0) {
          setBackgroundImages(imageList);
          setLoading(false);
        } else {
          // Fallback to hardcoded list of images
          const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
          const fallbackImages = Array.from({ length: 7 }, (_, i) => `/background/${i + 1}.webp`);
          setBackgroundImages(fallbackImages);
          setLoading(false);
          console.log('All background images loaded successfully');
        }
      } catch (err) {
        // In case of error, use hardcoded paths
        const fallbackImages = Array.from({ length: 7 }, (_, i) => `/background/${i + 1}.webp`);
        setBackgroundImages(fallbackImages);
        setLoading(false);
        console.log('All background images loaded successfully');
      }
    }

    fetchBackgroundImages();
  }, []);

  // Handle image rotation
  useEffect(() => {
    if (backgroundImages.length <= 1) return;

    const rotationTimer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, interval);

    return () => clearInterval(rotationTimer);
  }, [backgroundImages, interval]);

  if (loading) {
    return null;
  }

  if (error) {
    console.error('Error loading background images:', error);
    return null;
  }

  if (backgroundImages.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeTime }}
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>
      
      {/* Gradient overlay */}
      <div 
        className={`absolute inset-0 z-1 bg-gradient-to-b ${
          darkMode 
            ? 'from-transparent via-slate-950/50 to-slate-950' 
            : 'from-transparent via-[#FFFDFA]/50 to-[#FFFDFA]'
        }`} 
      />
    </div>
  );
}