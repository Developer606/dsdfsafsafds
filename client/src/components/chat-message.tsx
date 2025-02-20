import { type Message } from "@shared/schema";
import { type Character } from "@shared/characters";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "rounded-lg p-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
