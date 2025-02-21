import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  character: Character;
}

export function ChatMessage({ message, character }: ChatMessageProps) {
  const isUser = message.isUser;
  // Safely format the timestamp with a fallback
  const time = message.timestamp ? format(new Date(message.timestamp), "h:mm a") : "";

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[80%] mb-4",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div className="flex flex-col gap-1">
        <img
          src={isUser ? "https://api.dicebear.com/7.x/avatars/svg?seed=user" : character.avatar}
          alt={isUser ? "User" : character.name}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-xs text-muted-foreground text-center">
          {isUser ? "You" : character.name}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "rounded-lg p-3 relative",
            isUser ? "bg-primary text-primary-foreground rounded-tr-none" : 
                    "bg-secondary text-secondary-foreground rounded-tl-none",
            // Add tail to message bubble
            "before:absolute before:w-0 before:h-0 before:border-[6px] before:border-transparent",
            isUser ? 
              "before:border-r-primary before:right-[-12px] before:top-0" :
              "before:border-l-secondary before:left-[-12px] before:top-0"
          )}
        >
          {message.content}
          {time && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] opacity-70">{time}</span>
              {isUser && (
                <div className="text-[10px] opacity-70">
                  <CheckCheck className="h-3 w-3 inline" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}