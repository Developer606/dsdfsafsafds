import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { stickers } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  character: Character;
}

export function ChatMessage({ message, character }: ChatMessageProps) {
  const isUser = message.isUser;

  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'sticker':
        const stickerData = stickers.categories
          .flatMap(cat => cat.stickers)
          .find(s => s.id === message.stickerId);

        if (!stickerData) return null;

        return (
          <img 
            src={stickerData.url}
            alt={stickerData.keywords.join(', ')}
            className="w-32 h-32 object-contain"
          />
        );

      case 'emoji':
        return (
          <span className="text-3xl">{message.content}</span>
        );

      default:
        return (
          <div className="text-sm">{message.content}</div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div className="flex flex-col">
        <div
          className={cn(
            "px-3 py-2 rounded-2xl relative",
            isUser
              ? "bg-[#dcf8c6] text-gray-800 rounded-br-none" 
              : "bg-white text-gray-800 rounded-bl-none",
            message.messageType === 'sticker' && "bg-transparent"
          )}
        >
          {renderMessageContent()}
          <div 
            className="text-[11px] text-gray-500 flex items-center gap-1 mt-1"
          >
            {format(new Date(message.timestamp), "h:mm a")}
            {isUser && (
              <div className="flex ml-1">
                <Check className="h-3 w-3 text-[#4fc3f7]" /> 
                <Check className="h-3 w-3 text-[#4fc3f7] -ml-2" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}