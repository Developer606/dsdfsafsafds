import React, { useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import type { Advertisement } from '@shared/schema';

interface AdvertisementCardProps {
  advertisement: Advertisement;
  className?: string;
}

export const AdvertisementCard: React.FC<AdvertisementCardProps> = ({ 
  advertisement, 
  className = '' 
}) => {
  const {
    id,
    title,
    description,
    imageUrl,
    buttonText,
    buttonLink,
    buttonStyle,
    backgroundColor,
    textColor,
    animationType
  } = advertisement;

  // Record impression when ad is viewed
  useEffect(() => {
    const recordImpression = async () => {
      try {
        await fetch(`/api/advertisements/${id}/impression`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Error recording impression:', error);
      }
    };

    recordImpression();
  }, [id]);

  // Handle click on the advertisement button
  const handleClick = async () => {
    try {
      await fetch(`/api/advertisements/${id}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error recording click:', error);
    }
  };

  // Animation variants based on the animation type
  const getAnimationVariant = () => {
    switch (animationType) {
      case 'slide':
        return {
          hidden: { x: -100, opacity: 0 },
          visible: { x: 0, opacity: 1, transition: { duration: 0.5 } }
        };
      case 'zoom':
        return {
          hidden: { scale: 0.8, opacity: 0 },
          visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
        };
      case 'fade':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.5 } }
        };
    }
  };

  // Determine if buttonLink is an internal or external link
  const isExternalLink = buttonLink.startsWith('http') || buttonLink.startsWith('https');
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={getAnimationVariant()}
      className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}
      style={{ 
        backgroundColor: backgroundColor || 'rgb(15, 23, 42)' // dark background similar to character card
      }}
    >
      <div className="relative">
        <div className="aspect-[3/4] rounded-xl overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 p-5 w-full">
          <div className="absolute top-4 left-4">
            <div className="text-xs text-purple-300 font-medium mb-1">
              Featured
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">
            {title}
          </h2>
          
          <div className="flex items-center mb-3">
            <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
              New
            </span>
            <span className="mx-2 text-gray-500">•</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star, i) => (
                <span
                  key={i}
                  className={`${i < 3 ? "text-amber-400" : "text-gray-600"} text-xs`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          
          {isExternalLink ? (
            <motion.a
              href={buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 ${
                buttonStyle === 'primary' ? 'bg-purple-500 hover:bg-purple-600' :
                buttonStyle === 'secondary' ? 'bg-pink-500 hover:bg-pink-600' :
                buttonStyle === 'outline' ? 'border border-purple-500 text-purple-500 hover:bg-purple-500/10' :
                'bg-purple-500 hover:bg-purple-600'
              } text-white font-medium text-sm rounded-full shadow-lg flex items-center max-w-fit`}
            >
              {buttonText}
            </motion.a>
          ) : (
            <Link href={buttonLink}>
              <motion.button
                onClick={handleClick}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 ${
                  buttonStyle === 'primary' ? 'bg-purple-500 hover:bg-purple-600' :
                  buttonStyle === 'secondary' ? 'bg-pink-500 hover:bg-pink-600' :
                  buttonStyle === 'outline' ? 'border border-purple-500 text-purple-500 hover:bg-purple-500/10' :
                  'bg-purple-500 hover:bg-purple-600'
                } text-white font-medium text-sm rounded-full shadow-lg flex items-center max-w-fit`}
              >
                {buttonText}
              </motion.button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};