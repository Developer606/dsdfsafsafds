import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogOverlay, 
  DialogPortal, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoViewerModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  messageId: number;
}

export function VideoViewerModal({
  isOpen,
  videoUrl,
  onClose,
  messageId
}: VideoViewerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Handle video play/pause
  const togglePlay = () => {
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle video mute/unmute
  const toggleMute = () => {
    if (videoElement) {
      videoElement.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle video reference to access HTMLVideoElement methods
  const handleVideoRef = (element: HTMLVideoElement) => {
    setVideoElement(element);
    
    // Add event listeners to sync UI state with video state
    if (element) {
      element.addEventListener('play', () => setIsPlaying(true));
      element.addEventListener('pause', () => setIsPlaying(false));
      element.addEventListener('ended', () => setIsPlaying(false));
    }
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-message-${messageId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
        <DialogContent className="max-w-4xl w-[90vw] p-1 bg-transparent border-0 shadow-xl">
          <DialogTitle className="sr-only">
            Video Viewer
          </DialogTitle>
          <div className="relative flex flex-col items-center">
            <div className="relative w-full bg-black rounded-lg overflow-hidden">
              <video 
                ref={handleVideoRef}
                src={videoUrl} 
                className="w-full max-h-[80vh] object-contain"
                controls={false}
                playsInline
                onClick={togglePlay}
              />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 rounded-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 rounded-full"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 rounded-full"
                    onClick={handleDownload}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute -top-2 -right-2 bg-gray-800/80 text-white hover:bg-gray-700 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}