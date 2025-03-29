import { useState } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import { MessageStatusIndicator } from "./message-status-indicator";
import { ImageViewerModal } from "./image-viewer-modal";
import { VideoViewerModal } from "./video-viewer-modal";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MessageBubbleProps {
  id: number;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  isCurrentUser: boolean;
  hasDeliveryAnimation?: boolean;
  chatStyle?: "whatsapp" | "chatgpt" | "messenger" | "kakaotalk";
  avatar?: string;
  userName?: string;
  imageData?: string; // Base64 encoded image data
  videoData?: string; // Base64 encoded video data
}

export function MessageBubble({
  id,
  content,
  timestamp,
  status,
  isCurrentUser,
  hasDeliveryAnimation = false,
  chatStyle = "whatsapp",
  avatar,
  userName,
  imageData,
  videoData
}: MessageBubbleProps) {
  // State for image/video viewer modals
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);
  
  // If we only have media (image/video) and no text content, handle it differently
  const isImageOnlyMessage = imageData && !content;
  const isVideoOnlyMessage = videoData && !content;
  // Format time string
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const bubbleVariants = {
    initial: { 
      opacity: 0,
      scale: 0.9,
      x: isCurrentUser ? 20 : -20
    },
    animate: { 
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  // ChatGPT style
  if (chatStyle === "chatgpt") {
    // For ChatGPT style, we keep the same UI for both image-only and text+image
    // as the container style is important for maintaining the ChatGPT look
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30, 
          duration: 0.4 
        }}
        className={cn(
          "py-6 px-4 md:px-8 w-full border-b",
          isCurrentUser 
            ? "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700" 
            : "bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-700"
        )}
      >
        <div className="flex gap-4 items-start max-w-3xl mx-auto">
          {!isCurrentUser && avatar && (
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700 shadow-sm">
              <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1.5 text-gray-600 dark:text-gray-300 flex items-center">
              {isCurrentUser ? "You" : userName}
              {!isCurrentUser && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-md">
                  AI Assistant
                </span>
              )}
            </p>
            <div className="prose dark:prose-invert max-w-none">
              {imageData && (
                <div className={cn(
                  "rounded-md overflow-hidden",
                  (content || videoData) ? "mb-3" : ""  // Only add margin bottom if there's content or video after the image
                )}>
                  <img 
                    src={imageData} 
                    alt="Shared image" 
                    className="max-w-full object-contain max-h-96 cursor-pointer"
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                </div>
              )}
              {/* Image viewer modal */}
              {imageData && (
                <ImageViewerModal 
                  isOpen={isImageViewerOpen}
                  imageUrl={imageData}
                  onClose={() => setIsImageViewerOpen(false)}
                  messageId={id}
                />
              )}
              {videoData && (
                <div className={cn(
                  "rounded-md overflow-hidden",
                  content ? "mb-3" : ""  // Only add margin bottom if there's content after the video
                )}>
                  <video 
                    src={videoData} 
                    className="max-w-full object-contain max-h-96 cursor-pointer"
                    controls
                    onClick={() => setIsVideoViewerOpen(true)}
                  />
                </div>
              )}
              {/* Video viewer modal */}
              {videoData && (
                <VideoViewerModal 
                  isOpen={isVideoViewerOpen}
                  videoUrl={videoData}
                  onClose={() => setIsVideoViewerOpen(false)}
                  messageId={id}
                />
              )}
              {content && (
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                  {content}
                </p>
              )}
              {isCurrentUser && (
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5">
                    {formatTime(timestamp)}
                  </span>
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                </div>
              )}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-blue-200 dark:ring-blue-800">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">You</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Messenger style
  if (chatStyle === "messenger") {
    // Special case: if it's an image-only message, show without bubble
    if (isImageOnlyMessage) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 380, 
            damping: 25 
          }}
          className={cn(
            "px-2 sm:px-4 py-1 sm:py-2 mb-1",
            isCurrentUser ? "ml-auto" : "mr-auto",
            "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
          )}
        >
          <div className={cn(
            "flex",
            isCurrentUser ? "justify-end" : "justify-start",
            "items-end gap-2"
          )}>
            {!isCurrentUser && avatar && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-2 ring-blue-100 dark:ring-blue-900">
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              </div>
            )}
            <div className={cn(
              "flex flex-col",
              isCurrentUser ? "items-end" : "items-start"
            )}>
              {!isCurrentUser && userName && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  {userName}
                </span>
              )}
              
              {/* Image without bubble */}
              <div className="rounded-lg overflow-hidden shadow-md">
                <img 
                  src={imageData} 
                  alt="Shared image" 
                  className="max-w-full object-contain max-h-72 cursor-pointer"
                  onClick={() => setIsImageViewerOpen(true)}
                />
              </div>
              
              {/* Image viewer modal */}
              <ImageViewerModal 
                isOpen={isImageViewerOpen}
                imageUrl={imageData!}
                onClose={() => setIsImageViewerOpen(false)}
                messageId={id}
              />
              
              <div className="flex items-center mt-1 gap-1.5 px-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(timestamp)}
                </span>
                {isCurrentUser && (
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }
    
    // Special case: if it's a video-only message, show without bubble
    if (isVideoOnlyMessage) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 380, 
            damping: 25 
          }}
          className={cn(
            "px-2 sm:px-4 py-1 sm:py-2 mb-1",
            isCurrentUser ? "ml-auto" : "mr-auto",
            "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
          )}
        >
          <div className={cn(
            "flex",
            isCurrentUser ? "justify-end" : "justify-start",
            "items-end gap-2"
          )}>
            {!isCurrentUser && avatar && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-2 ring-blue-100 dark:ring-blue-900">
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              </div>
            )}
            <div className={cn(
              "flex flex-col",
              isCurrentUser ? "items-end" : "items-start"
            )}>
              {!isCurrentUser && userName && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  {userName}
                </span>
              )}
              
              {/* Video without bubble */}
              <div className="rounded-lg overflow-hidden shadow-md">
                <video 
                  src={videoData} 
                  className="max-w-full object-contain max-h-72 cursor-pointer"
                  controls
                  onClick={() => setIsVideoViewerOpen(true)}
                />
              </div>
              
              {/* Video viewer modal */}
              <VideoViewerModal 
                isOpen={isVideoViewerOpen}
                videoUrl={videoData!}
                onClose={() => setIsVideoViewerOpen(false)}
                messageId={id}
              />
              
              <div className="flex items-center mt-1 gap-1.5 px-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(timestamp)}
                </span>
                {isCurrentUser && (
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }
    
    // Regular message with text (and possibly an image)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 380, 
          damping: 25 
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-1",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isCurrentUser ? "justify-end" : "justify-start",
          "items-end gap-2"
        )}>
          {!isCurrentUser && avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-2 ring-blue-100 dark:ring-blue-900">
              <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start"
          )}>
            {!isCurrentUser && userName && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                {userName}
              </span>
            )}
            <div className={cn(
              "px-3 py-2 rounded-2xl max-w-full shadow-sm",
              isCurrentUser 
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 text-black dark:text-white"
            )}>
              {imageData && (
                <div className="mb-2 rounded-lg overflow-hidden">
                  <img 
                    src={imageData} 
                    alt="Shared image" 
                    className="max-w-full object-contain max-h-72 cursor-pointer"
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                </div>
              )}
              {/* Image viewer modal */}
              {imageData && (
                <ImageViewerModal 
                  isOpen={isImageViewerOpen}
                  imageUrl={imageData}
                  onClose={() => setIsImageViewerOpen(false)}
                  messageId={id}
                />
              )}
              {videoData && (
                <div className="mb-2 rounded-lg overflow-hidden">
                  <video 
                    src={videoData} 
                    className="max-w-full object-contain max-h-72 cursor-pointer"
                    controls
                    onClick={() => setIsVideoViewerOpen(true)}
                  />
                </div>
              )}
              {/* Video viewer modal */}
              {videoData && (
                <VideoViewerModal 
                  isOpen={isVideoViewerOpen}
                  videoUrl={videoData}
                  onClose={() => setIsVideoViewerOpen(false)}
                  messageId={id}
                />
              )}
              {content && (
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                  {content}
                </p>
              )}
            </div>
            <div className="flex items-center mt-1 gap-1.5 px-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(timestamp)}
              </span>
              {isCurrentUser && (
                <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // KakaoTalk style
  if (chatStyle === "kakaotalk") {
    // Special case: if it's an image-only message, show without bubble
    if (isImageOnlyMessage) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25 
          }}
          className={cn(
            "px-2 sm:px-4 py-1 sm:py-2 mb-1",
            isCurrentUser ? "ml-auto" : "mr-auto",
            "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
          )}
        >
          <div className={cn(
            "flex",
            isCurrentUser ? "justify-end" : "justify-start",
            "items-end gap-2"
          )}>
            {!isCurrentUser && (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm bg-pink-200">
                {avatar ? (
                  <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-pink-200 text-pink-800">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
            )}
            <div className={cn(
              "flex flex-col",
              isCurrentUser ? "items-end" : "items-start"
            )}>
              {!isCurrentUser && userName && (
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">
                  {userName}
                </span>
              )}
              
              {/* Image without bubble */}
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img 
                  src={imageData} 
                  alt="Shared image" 
                  className="max-w-full object-contain max-h-64 cursor-pointer"
                  onClick={() => setIsImageViewerOpen(true)}
                />
              </div>
              
              {/* Image viewer modal */}
              <ImageViewerModal 
                isOpen={isImageViewerOpen}
                imageUrl={imageData!}
                onClose={() => setIsImageViewerOpen(false)}
                messageId={id}
              />
              
              <div className="flex items-center mt-1 gap-1 px-1">
                <span className="text-[10px] text-gray-500">
                  오후 {formatTime(timestamp)}
                </span>
                {isCurrentUser && (
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                )}
              </div>
            </div>
            {isCurrentUser && (
              <div className="w-6 h-6">
                {/* Placeholder for KakaoTalk character emoji that would appear on the right of user messages */}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    // Special case: if it's a video-only message, show without bubble
    if (isVideoOnlyMessage) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25 
          }}
          className={cn(
            "px-2 sm:px-4 py-1 sm:py-2 mb-1",
            isCurrentUser ? "ml-auto" : "mr-auto",
            "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
          )}
        >
          <div className={cn(
            "flex",
            isCurrentUser ? "justify-end" : "justify-start",
            "items-end gap-2"
          )}>
            {!isCurrentUser && (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm bg-pink-200">
                {avatar ? (
                  <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-pink-200 text-pink-800">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
            )}
            <div className={cn(
              "flex flex-col",
              isCurrentUser ? "items-end" : "items-start"
            )}>
              {!isCurrentUser && userName && (
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">
                  {userName}
                </span>
              )}
              
              {/* Video without bubble */}
              <div className="rounded-2xl overflow-hidden shadow-md">
                <video 
                  src={videoData} 
                  className="max-w-full object-contain max-h-64 cursor-pointer"
                  controls
                  onClick={() => setIsVideoViewerOpen(true)}
                />
              </div>
              
              {/* Video viewer modal */}
              <VideoViewerModal 
                isOpen={isVideoViewerOpen}
                videoUrl={videoData!}
                onClose={() => setIsVideoViewerOpen(false)}
                messageId={id}
              />
              
              <div className="flex items-center mt-1 gap-1 px-1">
                <span className="text-[10px] text-gray-500">
                  오후 {formatTime(timestamp)}
                </span>
                {isCurrentUser && (
                  <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
                )}
              </div>
            </div>
            {isCurrentUser && (
              <div className="w-6 h-6">
                {/* Placeholder for KakaoTalk character emoji that would appear on the right of user messages */}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    // Regular message with text (and possibly an image)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-1",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex",
          isCurrentUser ? "justify-end" : "justify-start",
          "items-end gap-2"
        )}>
          {!isCurrentUser && (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm bg-pink-200">
              {avatar ? (
                <img src={avatar} alt={userName || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-pink-200 text-pink-800">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>
          )}
          <div className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start"
          )}>
            {!isCurrentUser && userName && (
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">
                {userName}
              </span>
            )}
            <div className={cn(
              "py-2 px-3 rounded-3xl max-w-full border-[1.5px]",
              isCurrentUser 
                ? "bg-[#FF7A7A] text-white border-[#FF6B6B] rounded-tr-sm" 
                : "bg-white text-gray-800 border-gray-200 dark:bg-gray-100 dark:text-gray-800 rounded-tl-sm"
            )}>
              {imageData && (
                <div className="mb-2 rounded-2xl overflow-hidden">
                  <img 
                    src={imageData} 
                    alt="Shared image" 
                    className="max-w-full object-contain max-h-64 cursor-pointer"
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                </div>
              )}
              {/* Image viewer modal */}
              {imageData && (
                <ImageViewerModal 
                  isOpen={isImageViewerOpen}
                  imageUrl={imageData}
                  onClose={() => setIsImageViewerOpen(false)}
                  messageId={id}
                />
              )}
              {videoData && (
                <div className="mb-2 rounded-2xl overflow-hidden">
                  <video 
                    src={videoData} 
                    className="max-w-full object-contain max-h-64 cursor-pointer"
                    controls
                    onClick={() => setIsVideoViewerOpen(true)}
                  />
                </div>
              )}
              {/* Video viewer modal */}
              {videoData && (
                <VideoViewerModal 
                  isOpen={isVideoViewerOpen}
                  videoUrl={videoData}
                  onClose={() => setIsVideoViewerOpen(false)}
                  messageId={id}
                />
              )}
              {content && (
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                  {content}
                </p>
              )}
            </div>
            <div className="flex items-center mt-1 gap-1 px-1">
              <span className="text-[10px] text-gray-500">
                오후 {formatTime(timestamp)}
              </span>
              {isCurrentUser && (
                <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
              )}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-6 h-6">
              {/* Placeholder for KakaoTalk character emoji that would appear on the right of user messages */}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // WhatsApp style (default)
  
  // Special case: if it's an image-only message, show without bubble
  if (isImageOnlyMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 420, 
          damping: 28
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-1",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex flex-col",
          isCurrentUser ? "items-end" : "items-start"
        )}>
          {!isCurrentUser && userName && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
              {userName}
            </p>
          )}
          
          {/* Image without bubble container */}
          <div className="rounded-md overflow-hidden shadow-md">
            <img 
              src={imageData} 
              alt="Shared image" 
              className="max-w-full object-contain max-h-80 cursor-pointer"
              onClick={() => setIsImageViewerOpen(true)}
            />
          </div>
          
          {/* Image viewer modal */}
          <ImageViewerModal 
            isOpen={isImageViewerOpen}
            imageUrl={imageData!}
            onClose={() => setIsImageViewerOpen(false)}
            messageId={id}
          />
          
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {formatTime(timestamp)}
            </span>
            {isCurrentUser && (
              <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
            )}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Special case: if it's a video-only message, show without bubble
  if (isVideoOnlyMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 420, 
          damping: 28
        }}
        className={cn(
          "px-2 sm:px-4 py-1 sm:py-2 mb-1",
          isCurrentUser ? "ml-auto" : "mr-auto",
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
        )}
      >
        <div className={cn(
          "flex flex-col",
          isCurrentUser ? "items-end" : "items-start"
        )}>
          {!isCurrentUser && userName && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
              {userName}
            </p>
          )}
          
          {/* Video without bubble container */}
          <div className="rounded-md overflow-hidden shadow-md">
            <video 
              src={videoData} 
              className="max-w-full object-contain max-h-80 cursor-pointer"
              controls
              onClick={() => setIsVideoViewerOpen(true)}
            />
          </div>
          
          {/* Video viewer modal */}
          <VideoViewerModal 
            isOpen={isVideoViewerOpen}
            videoUrl={videoData!}
            onClose={() => setIsVideoViewerOpen(false)}
            messageId={id}
          />
          
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {formatTime(timestamp)}
            </span>
            {isCurrentUser && (
              <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
            )}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Regular message with text (and possibly an image)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 420, 
        damping: 28
      }}
      className={cn(
        "px-2 sm:px-4 py-1 sm:py-2 mb-1",
        isCurrentUser ? "ml-auto" : "mr-auto",
        "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
      )}
    >
      <div className={cn(
        "flex flex-col",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-sm relative",
          isCurrentUser 
            ? "bg-[#e7ffdb] dark:bg-emerald-800/90 rounded-tr-none border border-green-100 dark:border-emerald-700" 
            : "bg-white dark:bg-slate-800/95 rounded-tl-none border border-gray-100 dark:border-slate-700",
          "max-w-full"
        )}>
          {/* WhatsApp-style bubble tail */}
          <div className={cn(
            "absolute top-0 w-3 h-3 overflow-hidden",
            isCurrentUser ? "-right-3" : "-left-3"
          )}>
            <div className={cn(
              "absolute transform rotate-45 w-4 h-4 border",
              isCurrentUser 
                ? "bg-[#e7ffdb] dark:bg-emerald-800/90 -top-2 -left-2 border-green-100 dark:border-emerald-700" 
                : "bg-white dark:bg-slate-800/95 -top-2 -right-2 border-gray-100 dark:border-slate-700"
            )}></div>
          </div>
          
          {!isCurrentUser && userName && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
              {userName}
            </p>
          )}
          {imageData && (
            <div className="mb-2 rounded-md overflow-hidden border-0">
              <img 
                src={imageData} 
                alt="Shared image" 
                className="max-w-full object-contain max-h-80 cursor-pointer"
                onClick={() => setIsImageViewerOpen(true)}
              />
            </div>
          )}
          {/* Image viewer modal */}
          {imageData && (
            <ImageViewerModal 
              isOpen={isImageViewerOpen}
              imageUrl={imageData}
              onClose={() => setIsImageViewerOpen(false)}
              messageId={id}
            />
          )}
          {videoData && (
            <div className="mb-2 rounded-md overflow-hidden border-0">
              <video 
                src={videoData} 
                className="max-w-full object-contain max-h-80 cursor-pointer"
                controls
                onClick={() => setIsVideoViewerOpen(true)}
              />
            </div>
          )}
          {/* Video viewer modal */}
          {videoData && (
            <VideoViewerModal 
              isOpen={isVideoViewerOpen}
              videoUrl={videoData}
              onClose={() => setIsVideoViewerOpen(false)}
              messageId={id}
            />
          )}
          {content && (
            <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {formatTime(timestamp)}
            </span>
            {isCurrentUser && (
              <MessageStatusIndicator status={status} animate={hasDeliveryAnimation} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}