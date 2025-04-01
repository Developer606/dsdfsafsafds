import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { MessageSquare } from 'lucide-react';
import { AdvertisementCard } from './advertisement-card';
import type { Advertisement } from '@shared/schema';

interface FeaturedSectionProps {
  className?: string;
}

// Character card component for feature section
const CharacterCard = ({ character }: { character: any }) => {
  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg">
      <div className="relative">
        <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
          <img
            src={character.avatar}
            alt={character.name}
            className="w-full h-full object-cover"
          />
          {/* Enhanced gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          
          {/* Decorative element in the corner */}
          {character.isNew && (
            <div className="absolute top-4 right-4 bg-purple-500 text-white text-xs px-3 py-1 rounded-full shadow-lg font-medium">
              NEW
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 p-5 w-full">
          <div className="text-xs text-purple-300 font-medium mb-2 flex items-center">
            <span className="mr-2">⭐</span>
            Featured Character
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">
            {character.name}
          </h2>
          <p className="text-gray-300 text-sm mt-1 line-clamp-2 mb-3 opacity-90">
            {character.description.substring(0, 80) + (character.description.length > 80 ? '...' : '')}
          </p>
          <div className="flex items-center mt-2">
            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
              {character.isNew ? "New" : "Popular"}
            </span>
            <span className="mx-2 text-gray-500">•</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star, i) => (
                <span
                  key={i}
                  className={`${i < 4 ? "text-amber-400" : "text-gray-600"} text-xs`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <Link href={`/chat/${character.id}`}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium hover:bg-purple-600 flex items-center shadow-lg"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ className = '' }) => {
  // Always start with index 0 (which will be the predefined character)
  const [currentIndex, setCurrentIndex] = useState(0);
  const queryClient = useQueryClient();

  // Fetch active advertisements with increased polling frequency and real-time updates
  const { data: advertisements = [], isLoading: isLoadingAds } = useQuery<Advertisement[]>({
    queryKey: ['/api/advertisements/active'],
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 1000, // Data becomes stale after 1 second
    refetchOnWindowFocus: true, // Refresh when window gets focus
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnReconnect: true, // Refresh when reconnecting after lost connection
  });

  // Fetch characters with real-time updates
  const { data: characters = [], isLoading: isLoadingCharacters } = useQuery<any[]>({
    queryKey: ['/api/characters'],
    refetchInterval: 5000, // Refresh every 5 seconds to check for new characters
    refetchOnWindowFocus: true, // Refresh when window gets focus
    refetchOnMount: true, // Always refresh when component mounts
  });

  // Sort characters to get featured ones first
  const sortedCharacters = [...characters].sort((a, b) => {
    // If one has isNew and the other doesn't, the one with isNew comes first
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    // Otherwise, maintain the original order
    return 0;
  });

  // Find a predefined character (not a custom one)
  const predefinedCharacter = sortedCharacters.find(char => !char.id.startsWith('custom_'));
  
  // Combine advertisements and characters into a single array of featured items
  // Always show a predefined character first if available, then advertisements
  const featuredItems = [
    // Add the predefined character first if it exists
    ...(predefinedCharacter ? 
        [{ type: 'character', data: predefinedCharacter, id: `char-${predefinedCharacter.id}` }] : 
        []),
    // Then add all advertisements
    ...advertisements.map(ad => ({ type: 'advertisement', data: ad, id: `ad-${ad.id}` }))
  ];
  
  // Reset to the first item (predefined character) when the featured items change
  // This ensures we always start with the character when it becomes available
  useEffect(() => {
    // If there are featured items and predefinedCharacter is the first item, reset index to 0
    if (featuredItems.length > 0 && predefinedCharacter) {
      setCurrentIndex(0);
    }
  }, [predefinedCharacter, featuredItems.length]);

  // Create a key that changes when featured items change to force re-render
  const [featuredItemsKey, setFeaturedItemsKey] = useState(Date.now());
  
  // Force refresh all data
  const refreshAllData = useCallback(() => {
    // Invalidate both queries to force a refresh
    queryClient.invalidateQueries({ queryKey: ['/api/advertisements/active'] });
    queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
    // Update the key to force re-render
    setFeaturedItemsKey(Date.now());
  }, [queryClient]);

  // Auto-rotate through featured items
  useEffect(() => {
    if (featuredItems.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === featuredItems.length - 1 ? 0 : prevIndex + 1
        );
      }, 7000); // Change featured item every 7 seconds

      return () => clearInterval(intervalId);
    }
  }, [featuredItems.length]);
  
  // Set up an interval to periodically force-refresh all data
  useEffect(() => {
    const refreshIntervalId = setInterval(() => {
      refreshAllData();
    }, 8000); // Force refresh all data every 8 seconds
    
    // Also refresh when this component mounts
    refreshAllData();
    
    return () => clearInterval(refreshIntervalId);
  }, [refreshAllData]);
  
  // Watch for changes in featured items and update the key
  useEffect(() => {
    if (advertisements.length > 0 || characters.length > 0) {
      setFeaturedItemsKey(Date.now());
    }
  }, [advertisements, characters]);

  // Handle manual navigation
  const goToItem = (index: number) => {
    setCurrentIndex(index);
  };

  // Loading state
  if (isLoadingAds || isLoadingCharacters) {
    return (
      <div className={`${className} animate-pulse rounded-xl bg-gradient-to-r from-pink-100/50 to-purple-100/50 dark:from-pink-950/50 dark:to-purple-950/50 h-72 mb-6`}></div>
    );
  }

  // No featured items
  if (featuredItems.length === 0) {
    return null;
  }

  return (
    <div className={`${className} relative mb-8`} key={`featured-section-${featuredItemsKey}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Featured
          {/* Add a small indicator when content refreshes */}
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 ml-1.5 opacity-0 animate-ping" />
        </h2>
        <div className="flex items-center">
          <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:underline mr-4">See all</a>
          {featuredItems.length > 1 && (
            <div className="flex space-x-2">
              {featuredItems.map((item, index: number) => (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => goToItem(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === index 
                      ? 'bg-purple-500 scale-110' 
                      : 'bg-gray-300 dark:bg-gray-600 opacity-70'
                  }`}
                  aria-label={`Go to featured item ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${featuredItemsKey}`}
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.97 }}
          transition={{ 
            duration: 0.6, 
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          {featuredItems[currentIndex] && (
            featuredItems[currentIndex].type === 'advertisement' ? (
              <AdvertisementCard 
                key={`ad-${featuredItems[currentIndex].id}-${featuredItemsKey}`}
                advertisement={featuredItems[currentIndex].data} 
              />
            ) : (
              <CharacterCard
                key={`char-${featuredItems[currentIndex].data.id}-${featuredItemsKey}`}
                character={featuredItems[currentIndex].data}
              />
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};