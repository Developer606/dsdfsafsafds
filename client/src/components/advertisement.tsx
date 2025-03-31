import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, X } from "lucide-react";

interface AdButton {
  id: number;
  adId: number;
  text: string;
  url: string;
  buttonColor: string;
  textColor: string;
  size: string;
  placement: string;
  isNewTab: boolean;
  sortOrder: number;
  clicks: number;
}

interface Advertisement {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  backgroundGradient: string | null;
  backgroundImageUrl: string | null;
  isActive: boolean;
  displayDuration: number;
  animation: string;
  sortOrder: number;
  expiresAt: string | null;
  textColor: string;
  textAlignment: string;
  fontSize: string;
  views: number;
  clicks: number;
  buttons?: AdButton[];
}

const Advertisement: React.FC<{
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  maxWidth?: string;
}> = ({ 
  className = "", 
  onClose, 
  showCloseButton = true,
  maxWidth = "400px" 
}) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch advertisements
  const { data: ads, isLoading, error } = useQuery<Advertisement[]>({
    queryKey: ['/api/advertisements'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Track ad view when it becomes visible
  useEffect(() => {
    if (isVisible && ads && ads.length > 0) {
      const currentAd = ads[currentAdIndex];
      // Track view
      apiRequest(`/api/advertisements/${currentAd.id}/view`, 'POST');
      
      // Set up rotation if there are multiple ads
      if (ads.length > 1) {
        const timer = setTimeout(() => {
          setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
        }, currentAd.displayDuration * 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [ads, currentAdIndex, isVisible]);
  
  // Handle ad click
  const handleAdClick = (adId: number) => {
    // Track click
    apiRequest(`/api/advertisements/${adId}/click`, 'POST');
  };
  
  // Handle button click
  const handleButtonClick = (buttonId: number) => {
    // Track button click
    apiRequest(`/api/ad-buttons/${buttonId}/click`, 'POST');
  };

  // Handle close button click
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  // If no ads or hidden, don't render anything
  if (!isVisible || !ads || ads.length === 0) {
    return null;
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <Card className={`overflow-hidden relative ${className}`} style={{ maxWidth }}>
        <CardContent className="p-4 flex justify-center items-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Show error state
  if (error) {
    return null; // Don't show anything on error
  }
  
  const currentAd = ads[currentAdIndex];
  if (!currentAd || !currentAd.isActive) return null;
  
  // Determine font size based on ad settings
  const getFontSize = () => {
    switch (currentAd.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base'; // medium
    }
  };
  
  // Determine button size based on button settings
  const getButtonSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-xs py-1 px-2';
      case 'large': return 'text-lg py-2 px-4';
      default: return 'text-sm py-1.5 px-3'; // medium
    }
  };
  
  // Background style for the ad
  const backgroundStyle = {
    backgroundColor: currentAd.backgroundColor,
    color: currentAd.textColor,
    backgroundImage: currentAd.backgroundGradient || 
                    (currentAd.backgroundImageUrl ? `url(${currentAd.backgroundImageUrl})` : 'none'),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    textAlign: currentAd.textAlignment as 'left' | 'center' | 'right',
  };
  
  // Animation class based on ad settings
  const getAnimationClass = () => {
    switch (currentAd.animation) {
      case 'fade': return 'animate-fade-in';
      case 'slide': return 'animate-slide-in-right';
      case 'zoom': return 'animate-zoom-in';
      default: return '';
    }
  };

  return (
    <Card 
      className={`overflow-hidden relative ${getAnimationClass()} ${className}`}
      style={{ maxWidth }}
    >
      {showCloseButton && (
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 rounded-full bg-black/40 hover:bg-black/60 p-1 text-white"
          aria-label="Close advertisement"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div 
        style={backgroundStyle}
        className="p-4"
        onClick={() => handleAdClick(currentAd.id)}
      >
        <div className={`${getFontSize()} flex flex-col items-${currentAd.textAlignment}`}>
          <h3 className="font-bold mb-1">{currentAd.title}</h3>
          
          {currentAd.imageUrl && (
            <div className="my-2 flex justify-center w-full">
              <img 
                src={currentAd.imageUrl} 
                alt={currentAd.title} 
                className="max-w-full max-h-32 object-contain"
              />
            </div>
          )}
          
          <p className="mb-3">{currentAd.description}</p>
          
          {/* Render buttons */}
          {currentAd.buttons && currentAd.buttons.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {currentAd.buttons
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((button) => (
                  <a
                    key={button.id}
                    href={button.url}
                    target={button.isNewTab ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation(); // Don't trigger ad click
                      handleButtonClick(button.id);
                    }}
                    className={`rounded ${getButtonSize(button.size)} inline-block text-center no-underline`}
                    style={{
                      backgroundColor: button.buttonColor,
                      color: button.textColor
                    }}
                  >
                    {button.text}
                  </a>
                ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Advertisement;