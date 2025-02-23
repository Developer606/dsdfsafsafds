import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  character: Character;
}

export function ChatMessage({ message, character }: ChatMessageProps) {
  const isUser = message.isUser;

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
              : "bg-white text-gray-800 rounded-bl-none" 
          )}
        >
          <div className="text-sm">{message.content}</div>
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