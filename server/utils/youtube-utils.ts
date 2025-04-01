/**
 * Utility functions for handling YouTube URLs
 */

/**
 * Utility functions for handling YouTube URLs
 */

/**
 * Sanitizes a YouTube URL by extracting the video ID and returning an embed URL
 * 
 * @param url The YouTube URL to sanitize
 * @param isVideo Whether the URL is for a video (true) or an image thumbnail (false)
 * @returns The sanitized URL (embed format) or the original URL if not a YouTube URL
 */
export const sanitizeYouTubeUrl = (url: string, isVideo: boolean = true): string => {
  if (!url) return url;
  
  // First, clean up any malformed URLs that concatenate multiple URLs
  if (url.includes('http') && url.indexOf('http', 10) > 0) {
    console.log('Detected malformed URL with multiple http parts:', url);
    
    // Extract the last occurrence of http:// or https://
    const lastHttpIndex = url.lastIndexOf('http');
    if (lastHttpIndex > 0) {
      url = url.substring(lastHttpIndex);
      console.log('Cleaned URL:', url);
    }
  }
  
  // Check if it's a YouTube URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    console.log('Sanitizing YouTube URL');
    
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    let isShort = false;
    
    // Extract from youtu.be format
    if (url.includes('youtu.be/')) {
      const match = /youtu\.be\/([^?&/]+)/.exec(url);
      if (match && match[1]) videoId = match[1];
    } 
    // Extract from youtube.com/watch format
    else if (url.includes('youtube.com/watch')) {
      const match = /v=([^&]+)/.exec(url);
      if (match && match[1]) videoId = match[1];
    } 
    // Extract from YouTube Shorts format
    else if (url.includes('youtube.com/shorts/')) {
      const match = /shorts\/([^?&/]+)/.exec(url);
      if (match && match[1]) {
        videoId = match[1];
        isShort = true;
      }
    }
    // Extract from embed format
    else if (url.includes('youtube.com/embed/')) {
      const match = /embed\/([^?&/]+)/.exec(url);
      if (match && match[1]) videoId = match[1];
    }
    
    if (videoId) {
      console.log('Extracted YouTube video ID:', videoId, isShort ? '(Short video)' : '');
      
      if (isVideo) {
        // For videos, return proper embed URL with appropriate parameters
        if (isShort) {
          // Special parameters for shorts to make them loop and auto-play
          return `https://www.youtube.com/embed/${videoId}?loop=1&controls=1&modestbranding=1&rel=0&autoplay=1`;
        } else {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&controls=1`;
        }
      } else {
        // For image thumbnails, use YouTube's thumbnail service
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
  }
  
  return url;
};

/**
 * Checks if a URL is a YouTube URL
 * 
 * @param url The URL to check
 * @returns True if the URL is a YouTube URL, false otherwise
 */
export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

/**
 * Gets the thumbnail URL for a YouTube video
 * 
 * @param url The YouTube URL
 * @returns The thumbnail URL or null if not a YouTube URL or couldn't extract video ID
 */
export const getYouTubeThumbnailUrl = (url: string): string | null => {
  if (!isYouTubeUrl(url)) return null;
  
  // Extract video ID
  let videoId = '';
  
  // Extract from youtu.be format
  if (url.includes('youtu.be/')) {
    const match = /youtu\.be\/([^?&]+)/.exec(url);
    if (match && match[1]) videoId = match[1];
  } 
  // Extract from youtube.com/watch format
  else if (url.includes('youtube.com/watch')) {
    const match = /v=([^&]+)/.exec(url);
    if (match && match[1]) videoId = match[1];
  } 
  // Extract from YouTube Shorts format
  else if (url.includes('youtube.com/shorts/')) {
    const match = /shorts\/([^?&]+)/.exec(url);
    if (match && match[1]) videoId = match[1];
  }
  // Extract from embed format
  else if (url.includes('youtube.com/embed/')) {
    const match = /embed\/([^?&]+)/.exec(url);
    if (match && match[1]) videoId = match[1];
  }
  
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  
  return null;
};