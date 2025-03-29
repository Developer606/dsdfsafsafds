import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoViewerModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  messageId: number;
}

export function VideoViewerModal({ isOpen, videoUrl, onClose, messageId }: VideoViewerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle closing on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `video-${messageId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div ref={modalRef} className="relative max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Video */}
        <div className="overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-[80vh] max-w-full object-contain"
            controls
            autoPlay
          />
        </div>

        {/* Download button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Download Video
          </button>
        </div>
      </div>
    </div>
  );
}