import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AdvertisementCard } from './advertisement-card';
import type { Advertisement } from '@shared/schema';

interface FeaturedSectionProps {
  className?: string;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ className = '' }) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Fetch active advertisements
  const { data: advertisements, isLoading, error } = useQuery({
    queryKey: ['/api/advertisements/active'],
    refetchInterval: 10000, // Refetch more frequently (every 10 seconds) to ensure real-time updates
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
      <div className={`${className} animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 h-64`}></div>
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
    <div className={`${className} relative`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Featured</h2>
        {advertisements.length > 1 && (
          <div className="flex space-x-1">
            {advertisements.map((_, index) => (
              <button
                key={index}
                onClick={() => goToAd(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentAdIndex === index 
                    ? 'bg-pink-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Go to advertisement ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      <motion.div
        key={currentAdIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AdvertisementCard 
          advertisement={advertisements[currentAdIndex] as Advertisement} 
        />
      </motion.div>
    </div>
  );
};