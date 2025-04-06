import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Maximize, Minimize, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentReaderProps {
  isOpen: boolean;
  onClose: () => void;
  contentUrl: string;
  title: string;
  type: "manga" | "book";
}

export function ContentReader({ isOpen, onClose, contentUrl, title, type }: ContentReaderProps) {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [contentType, setContentType] = useState<"pdf" | "iframe" | "image" | "unknown">("unknown");

  useEffect(() => {
    if (contentUrl) {
      setIsLoading(true);
      
      // Detect content type based on URL
      if (contentUrl.toLowerCase().endsWith(".pdf")) {
        setContentType("pdf");
      } else if (
        contentUrl.toLowerCase().includes("amazon.com") || 
        contentUrl.toLowerCase().includes("kindle") ||
        contentUrl.toLowerCase().includes("amzn")
      ) {
        setContentType("iframe");
      } else if (
        contentUrl.toLowerCase().endsWith(".jpg") ||
        contentUrl.toLowerCase().endsWith(".jpeg") ||
        contentUrl.toLowerCase().endsWith(".png") ||
        contentUrl.toLowerCase().endsWith(".webp") ||
        contentUrl.toLowerCase().endsWith(".gif")
      ) {
        setContentType("image");
      } else {
        // Default to iframe for other URLs
        setContentType("iframe");
      }
      
      setIsLoading(false);
    }
  }, [contentUrl]);

  const toggleFullscreen = () => {
    const element = document.documentElement;
    
    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };

  const handleZoomIn = () => {
    if (zoom < 200) {
      setZoom(zoom + 10);
    }
  };

  const handleZoomOut = () => {
    if (zoom > 50) {
      setZoom(zoom - 10);
    }
  };

  const handleDownload = () => {
    window.open(contentUrl, '_blank');
  };

  // Error handling for embedding
  const handleContentError = () => {
    toast({
      variant: "destructive",
      title: "Content Loading Error",
      description: "Unable to display the content in-app. Click the download button to open externally.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1200px] h-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-3 flex-row justify-between items-center border-b">
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            <span className="text-sm text-muted-foreground">({type === "manga" ? "Manga" : "Book"})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="text-xs w-12 text-center">{zoom}%</div>
            <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload} title="Download/Open Externally">
              <Download className="h-4 w-4" />
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <ScrollArea className="w-full h-[calc(100%-57px)]">
          <div 
            className="w-full min-h-full flex items-center justify-center p-4"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s" }}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading content...</p>
              </div>
            ) : contentType === "pdf" ? (
              <iframe 
                src={`${contentUrl}#toolbar=0`} 
                className="w-full h-full border-0 min-h-[800px]"
                onError={handleContentError}
                title={title}
              />
            ) : contentType === "image" ? (
              <img 
                src={contentUrl} 
                alt={title} 
                className="max-w-full" 
                onError={handleContentError}
              />
            ) : (
              <iframe 
                src={contentUrl} 
                className="w-full h-full border-0 min-h-[800px]"
                onError={handleContentError}
                title={title}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}