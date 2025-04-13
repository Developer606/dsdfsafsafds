import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  chatStyle?: 'whatsapp' | 'chatgpt' | 'messenger';
}

export function TypingIndicator({ chatStyle = 'whatsapp' }: TypingIndicatorProps) {
  // Different styling based on chat style
  switch (chatStyle) {
    case 'chatgpt':
      return (
        <div className="flex items-center gap-2 p-4 max-w-[80%] mr-auto">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      );
    
    case 'messenger':
      return (
        <div className="flex gap-2 max-w-[80%] mr-auto my-1">
          <div className="flex flex-col">
            <div className="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'whatsapp':
    default:
      return (
        <div className="flex gap-2 max-w-[80%] mr-auto my-1">
          <div className="flex flex-col">
            <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              </div>
            </div>
            <div className="text-[0.65rem] text-gray-500 dark:text-gray-400 mt-1 ml-2">typing...</div>
          </div>
        </div>
      );
  }
}
