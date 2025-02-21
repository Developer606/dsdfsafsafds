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
        "flex gap-3 max-w-[80%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <img
        src={isUser ? "https://api.dicebear.com/7.x/avatars/svg?seed=user" : character.avatar}
        alt={isUser ? "User" : character.name}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex flex-col">
        <div
          className={cn(
            "rounded-lg p-3 relative",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-secondary text-secondary-foreground rounded-tl-none"
          )}
        >
          {message.content}
          <div 
            className={cn(
              "text-xs mt-1 flex items-center gap-1",
              isUser ? "text-primary-foreground/70" : "text-secondary-foreground/70"
            )}
          >
            {format(new Date(message.createdAt), "h:mm a")}
            {isUser && (
              <div className="flex">
                <Check className="h-3 w-3" />
                <Check className="h-3 w-3 -ml-1" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}