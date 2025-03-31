import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AdvertisementCard } from './advertisement-card';
import type { Advertisement } from '@shared/schema';

interface FeaturedSectionProps {
  className?: string;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ className = '' }) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Fetch active advertisements
  const { data: advertisements = [], isLoading, error } = useQuery<Advertisement[]>({
    queryKey: ['/api/advertisements/active'],
    refetchInterval: 5000, // Refetch more frequently (every 5 seconds) to ensure real-time updates
  });

  // Auto-rotate through advertisements if there are multiple
  useEffect(() => {
    if (advertisements && advertisements.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentAdIndex((prevIndex) => 
          prevIndex === advertisements.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000); // Change ad every 8 seconds

      return () => clearInterval(intervalId);
    }
  }, [advertisements]);

  // Handle manual navigation
  const goToAd = (index: number) => {
    setCurrentAdIndex(index);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className} animate-pulse rounded-xl bg-gradient-to-r from-pink-100/50 to-purple-100/50 dark:from-pink-950/50 dark:to-purple-950/50 h-72 mb-6`}></div>
    );
  }

  // Error state
  if (error || !advertisements) {
    return null; // Don't show the section if there's an error or no data
  }

  // No active advertisements
  if (advertisements.length === 0) {
    return null;
  }

  return (
    <div className={`${className} relative mb-8`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          <span className="inline-block mr-2">✨</span>
          Featured
        </h2>
        {advertisements.length > 1 && (
          <div className="flex space-x-2">
            {advertisements.map((_: any, index: number) => (
              <button
                key={index}
                onClick={() => goToAd(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentAdIndex === index 
                    ? 'bg-pink-500 scale-110' 
                    : 'bg-gray-300 dark:bg-gray-600 opacity-70'
                }`}
                aria-label={`Go to advertisement ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAdIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          {advertisements[currentAdIndex] && (
            <AdvertisementCard 
              advertisement={advertisements[currentAdIndex]} 
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};