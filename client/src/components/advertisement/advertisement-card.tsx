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
  
  // Ensure URLs are properly formatted and help with video format compatibility
  const formatUrl = (url: string | null | undefined): string => {
    if (!url) {
      console.log('Null or undefined URL provided, using placeholder');
      return 'https://placehold.co/600x800/9333ea/ffffff?text=Advertisement';
    }
    
    // If empty string, return a default placeholder
    if (url.trim() === '') {
      console.log('Empty URL provided, using placeholder');
      return 'https://placehold.co/600x800/9333ea/ffffff?text=Advertisement';
    }
    
    // Fix malformed URLs that incorrectly combine '/uploads/advertisem' with external URLs
    if (url.includes('/uploads/advertisem') && (url.includes('http://') || url.includes('https://'))) {
      console.log('Fixing malformed URL that contains both upload path and external URL');
      
      // Extract the YouTube URL more aggressively, handling complex cases with multiple https:// parts
      if (url.includes('youtu.be') || url.includes('youtube.com')) {
        console.log('Detected YouTube URL in malformed path');
        
        // First try to extract a YouTube URL with standard regex
        let ytMatch = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[\?&][\w-]+=[\w-]+)*/.exec(url);
        
        if (ytMatch && ytMatch[0]) {
          // Found a full YouTube URL match
          const videoId = ytMatch[1];
          console.log('Successfully extracted YouTube video ID:', videoId);
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&controls=1`;
        } else {
          // Try to at least extract the video ID
          const idMatch = /([a-zA-Z0-9_-]{11})/.exec(url);
          if (idMatch && idMatch[1]) {
            console.log('Extracted only YouTube video ID as fallback:', idMatch[1]);
            return `https://www.youtube.com/embed/${idMatch[1]}?autoplay=1&mute=1&playsinline=1&loop=1&controls=1`;
          }
        }
      }
      
      // For non-YouTube URLs, try the standard extraction
      const externalUrlMatch = /(https?:\/\/[^\s]+)/.exec(url);
      if (externalUrlMatch && externalUrlMatch[0]) {
        console.log('Extracted external URL:', externalUrlMatch[0]);
        return externalUrlMatch[0];
      }
    }
    
    // Handle YouTube URLs
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      console.log('Detected YouTube URL:', url);
      
      // For embedded players, we need to use the standard format, not for direct video playback
      let videoId = '';
      
      // Extract video ID from various YouTube URL formats
      if (url.includes('youtu.be/')) {
        // Short URL format: youtu.be/VIDEO_ID
        const idMatch = /youtu\.be\/([^?&]+)/.exec(url);
        if (idMatch && idMatch[1]) videoId = idMatch[1];
      } else if (url.includes('youtube.com/watch')) {
        // Standard URL format: youtube.com/watch?v=VIDEO_ID
        const idMatch = /v=([^&]+)/.exec(url);
        if (idMatch && idMatch[1]) videoId = idMatch[1];
      } else if (url.includes('youtube.com/embed/')) {
        // Embed URL format: youtube.com/embed/VIDEO_ID
        const idMatch = /embed\/([^?&]+)/.exec(url);
        if (idMatch && idMatch[1]) videoId = idMatch[1];
      }
      
      if (videoId) {
        // Return a thumbnail for image mode or the video for video mode
        if (mediaType === 'video') {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&controls=1`;
        } else {
          return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
    }
    
    // If it's already a full URL, return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('Using full URL:', url);
      return url;
    }
    
    // If it's an uploaded file URL (starts with '/uploads'), make sure it's correctly formed
    if (url.startsWith('/uploads')) {
      console.log('Using uploaded file URL:', url);
      
      // Check if it's a video URL (by extension)
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
      
      if (isVideo && mediaType === 'video') {
        console.log('Adding video cache-busting parameter for better mobile playback');
        // Add a timestamp query parameter to prevent caching issues on mobile
        return `${url}?cb=${Date.now()}`;
      }
      
      return url;
    }
    
    // If it contains base64 data
    if (url.startsWith('data:')) {
      console.log('Using base64 data URL');
      return url;
    }
    
    // For any other format, assume it might be a relative path and return as is
    console.log('Using relative path URL:', url);
    return url;
  };
  
  // Handle image/video loading errors
  const handleMediaError = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>) => {
    console.error(`Error loading media from URL: ${e.currentTarget.src}`);
    console.error(`Original media URL before formatting: ${mediaType === 'video' ? videoUrl : imageUrl}`);
    
    // If using a video element, try to load the fallback image instead
    if (mediaType === 'video' && e.currentTarget instanceof HTMLVideoElement) {
      console.log('Video failed to load, using fallback image if available');
    }
    
    // Only try to fetch if it's not a YouTube URL (which doesn't support direct fetching due to CORS)
    const isYouTubeUrl = e.currentTarget.src.includes('youtube.com') || e.currentTarget.src.includes('youtu.be');
    
    if (!isYouTubeUrl) {
      fetch(e.currentTarget.src)
        .then(response => {
          if (!response.ok) {
            console.error(`Media fetch failed with status: ${response.status}`);
          } else {
            console.log(`Media fetch succeeded but still can't display, might be CORS issue`);
          }
        })
        .catch(err => {
          console.error(`Network error fetching media: ${err.message}`);
        });
    } else {
      console.log('YouTube URL detected, skipping fetch test due to expected CORS restrictions');
      // For YouTube, we can't do a fetch test due to CORS, so we'll just assume it's working
      // The iframe embed should handle this properly
    }
  };
  
  // Initialize video playback and handle errors
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      // Try to play the video automatically when it's loaded
      const playVideo = async () => {
        try {
          // Make sure video is visible and loaded
          if (videoRef.current.readyState >= 2) {
            const playPromise = videoRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('Video playing automatically');
                  setIsPlaying(true);
                })
                .catch(error => {
                  console.warn('Auto-play prevented:', error);
                  // Auto-play was prevented, show play button instead
                  setIsPlaying(false);
                });
            }
          }
        } catch (error) {
          console.error('Error playing video:', error);
          setIsPlaying(false);
        }
      };
      
      // Try to play when video is loaded
      videoRef.current.addEventListener('loadeddata', playVideo);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', playVideo);
        }
      };
    }
  }, [mediaType]);

  // Video media controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Error playing video on click:', error);
            });
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      
      // If unmuting, try to play the video if it's not already playing
      if (!isMuted && !isPlaying) {
        togglePlay();
      }
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
              {/* Check if it's a YouTube URL after formatting */}
              {formatUrl(videoUrl).includes('youtube.com/embed') ? (
                <div className="relative w-full h-full">
                  <iframe
                    src={formatUrl(videoUrl)}
                    className="w-full h-full object-cover"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Embedded YouTube video"
                  />
                  <div className="absolute inset-0 pointer-events-none" 
                    style={{background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)'}}
                  ></div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={formatUrl(videoUrl)}
                    poster={formatUrl(imageUrl)}
                    className="w-full h-full object-cover"
                    muted={isMuted}
                    loop
                    playsInline
                    autoPlay={true}
                    webkitPlaysinline="true"
                    preload="auto"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={handleMediaError}
                    controlsList="nodownload"
                    disablePictureInPicture={true}
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  
                  {/* Video controls for local videos */}
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
                </>
              )}
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