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
        "flex gap-3 max-w-[80%] group",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {!isUser && (
        <img
          src={character.avatar}
          alt={character.name}
          className="w-8 h-8 rounded-full object-cover mt-1"
        />
      )}
      <div className="flex flex-col">
        {!isUser && (
          <span className="text-xs text-muted-foreground mb-1">{character.name}</span>
        )}
        <div
          className={cn(
            "px-4 py-2 rounded-2xl text-sm relative break-words",
            isUser
              ? "bg-[#00a884] text-white rounded-br-none" 
              : "bg-white text-gray-800 rounded-bl-none dark:bg-slate-800 dark:text-white"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div 
            className={cn(
              "text-[11px] flex items-center gap-1 mt-1",
              isUser ? "text-white/70" : "text-gray-500"
            )}
          >
            {format(new Date(message.timestamp), "h:mm a")}
            {isUser && (
              <div className="flex ml-1">
                <Check className="h-3 w-3" /> 
                <Check className="h-3 w-3 -ml-2" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}