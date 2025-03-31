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
      style={{ backgroundColor }}
    >
      <div className="relative">
        <div className="aspect-[3/2] rounded-t-xl overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        <div className="absolute top-2 left-2">
          <div className="inline-block px-2 py-1 bg-pink-500/80 rounded-full text-xs text-white font-medium">
            Featured
          </div>
        </div>
      </div>
      
      <div className="p-4" style={{ color: textColor }}>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-sm mb-4 opacity-90">{description}</p>
        
        {isExternalLink ? (
          <a
            href={buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`inline-block px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              buttonStyle === 'primary' ? 'bg-pink-500 text-white hover:bg-pink-600' :
              buttonStyle === 'secondary' ? 'bg-purple-500 text-white hover:bg-purple-600' :
              buttonStyle === 'outline' ? 'border border-current hover:bg-white/10' :
              'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            {buttonText}
          </a>
        ) : (
          <Link href={buttonLink}>
            <a
              onClick={handleClick}
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                buttonStyle === 'primary' ? 'bg-pink-500 text-white hover:bg-pink-600' :
                buttonStyle === 'secondary' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                buttonStyle === 'outline' ? 'border border-current hover:bg-white/10' :
                'bg-white text-gray-900 hover:bg-gray-100'
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