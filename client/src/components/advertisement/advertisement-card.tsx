import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { Advertisement } from '@shared/schema';

interface AdvertisementCardProps {
  advertisement: Advertisement;
  className?: string;
}

export const AdvertisementCard: React.FC<AdvertisementCardProps> = ({ 
  advertisement, 
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const {
    id,
    title,
    description,
    imageUrl,
    videoUrl,
    mediaType,
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
  
  // Ensure URLs are properly formatted
  const formatUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    
    // If it's already a full URL, return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's an uploaded file URL (starts with '/uploads'), make sure it's correctly formed
    if (url.startsWith('/uploads')) {
      console.log('Using uploaded file URL:', url);
      return url; // URL should be correct as-is since Express serves static files from '/uploads'
    }
    
    // If it contains base64 data
    if (url.startsWith('data:')) {
      return url;
    }
    
    // For any other format, assume it might be a relative path and return as is
    return url;
  };
  
  // Handle image/video loading errors
  const handleMediaError = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>) => {
    console.error(`Error loading media from URL: ${e.currentTarget.src}`);
    // If using a video element, try to load the fallback image instead
    if (mediaType === 'video' && e.currentTarget instanceof HTMLVideoElement) {
      console.log('Video failed to load, using fallback image if available');
    }
  };
  
  // Video media controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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
          {mediaType === 'video' && videoUrl ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={formatUrl(videoUrl)}
                poster={formatUrl(imageUrl)}
                className="w-full h-full object-cover"
                muted={isMuted}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleMediaError}
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Video controls */}
              <div className="absolute bottom-3 right-3 flex space-x-2">
                <button 
                  onClick={togglePlay}
                  className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                  onClick={toggleMute}
                  className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <img
              src={formatUrl(imageUrl)}
              alt={title}
              className="w-full h-full object-cover"
              onError={handleMediaError}
              crossOrigin="anonymous"
            />
          )}
          {/* Always show gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 p-5 w-full z-10">
          <div className="absolute top-4 left-4">
            <div className="text-xs text-purple-300 font-bold mb-1 drop-shadow-lg">
              Featured
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md">
            {title}
          </h2>

          {/* Optional short description with improved visibility */}
          {description && (
            <p className="text-sm text-gray-200 mb-3 line-clamp-2 drop-shadow-md">
              {description}
            </p>
          )}
          
          <div className="flex items-center mb-3">
            <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full drop-shadow-sm">
              New
            </span>
            <span className="mx-2 text-gray-400">•</span>
            <div className="flex drop-shadow-sm">
              {[1, 2, 3, 4, 5].map((star, i) => (
                <span
                  key={i}
                  className={`${i < 3 ? "text-amber-400" : "text-gray-500"} text-xs`}
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