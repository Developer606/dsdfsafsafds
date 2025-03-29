import { cn } from "@/lib/utils";

export function TypingIndicator() {
  return (
    <div className="flex gap-2 max-w-[80%] mr-auto">
      <div className="flex flex-col">
        <div className="px-4 py-2 rounded-2xl bg-white text-gray-800 rounded-bl-none">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
