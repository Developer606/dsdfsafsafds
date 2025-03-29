import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  style?: 'default' | 'whatsapp' | 'messenger' | 'kakao';
}

export function TypingIndicator({ style = 'default' }: TypingIndicatorProps) {
  return (
    <div className="flex items-center">
      <div className={cn(
        "relative flex items-center justify-center",
        style === 'whatsapp' && "max-w-[120px]",
        style === 'messenger' && "max-w-[80px]",
        style === 'kakao' && "max-w-[100px]",
      )}>
        {/* Speech bubble shape */}
        <div className={cn(
          "flex items-center justify-center rounded-full p-4",
          "bg-white dark:bg-gray-700 shadow-sm"
        )}>
          {/* Dots container - horizontal layout with spacing */}
          <div className="flex gap-2 items-center justify-center">
            {/* Three animated dots */}
            <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
          </div>
        </div>
        
        {/* Small circle to complete the speech bubble tail */}
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}
