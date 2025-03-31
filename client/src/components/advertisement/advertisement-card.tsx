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
      className={`relative rounded-xl overflow-hidden shadow-xl border border-pink-300/30 dark:border-pink-500/30 ${className}`}
      style={{ 
        backgroundColor: backgroundColor ? backgroundColor : 'rgba(255, 192, 203, 0.1)', 
        boxShadow: '0 10px 25px -5px rgba(233, 30, 99, 0.1), 0 8px 10px -6px rgba(233, 30, 99, 0.1)'
      }}
    >
      <div className="relative">
        <div className="aspect-[3/2] rounded-t-xl overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
        </div>
        
        <div className="absolute top-3 left-3">
          <div className="inline-block px-3 py-1 bg-pink-500 rounded-full text-xs text-white font-semibold shadow-lg">
            Featured
          </div>
        </div>
      </div>
      
      <div className="p-5" style={{ color: textColor ? textColor : '#1f2937' }}>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm mb-5 opacity-90">{description}</p>
        
        {isExternalLink ? (
          <a
            href={buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`inline-block px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
              buttonStyle === 'primary' ? 'bg-pink-500 text-white hover:bg-pink-600 hover:scale-105' :
              buttonStyle === 'secondary' ? 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-105' :
              buttonStyle === 'outline' ? 'border-2 border-current hover:bg-white/10 hover:scale-105' :
              'bg-white text-gray-900 hover:bg-gray-100 hover:scale-105'
            }`}
          >
            {buttonText}
          </a>
        ) : (
          <Link href={buttonLink}>
            <a
              onClick={handleClick}
              className={`inline-block px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                buttonStyle === 'primary' ? 'bg-pink-500 text-white hover:bg-pink-600 hover:scale-105' :
                buttonStyle === 'secondary' ? 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-105' :
                buttonStyle === 'outline' ? 'border-2 border-current hover:bg-white/10 hover:scale-105' :
                'bg-white text-gray-900 hover:bg-gray-100 hover:scale-105'
              }`}
            >
              {buttonText}
            </a>
          </Link>
        )}
      </div>
    </motion.div>
  );
};