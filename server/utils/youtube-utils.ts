/**
 * Utility functions for handling YouTube URLs
 */

/**
 * Sanitizes a YouTube URL by extracting the video ID and returning an embed URL
 * 
 * @param url The YouTube URL to sanitize
 * @returns The sanitized URL (embed format) or the original URL if not a YouTube URL
 */
export const sanitizeYouTubeUrl = (url: string): string => {
  if (!url) return url;
  
  // Check if it's a YouTube URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    console.log('Sanitizing YouTube URL');
    
    // Extract video ID from various YouTube URL formats
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
      // Return a proper YouTube embed URL
      console.log('Extracted YouTube video ID:', videoId);
      return `https://www.youtube.com/embed/${videoId}`;
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