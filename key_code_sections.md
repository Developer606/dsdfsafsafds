# Style Button Implementation

## 1. Style State Management (chat.tsx)
```typescript
// Style state
const [chatStyle, setChatStyle] = useState<"whatsapp" | "chatgpt" | "messenger">("whatsapp");

// Toggle function
const toggleChatStyle = () => {
  if (!user?.isPremium) {
    setShowSubscriptionDialog(true);
    return;
  }

  setChatStyle(prev => {
    switch (prev) {
      case "whatsapp": return "chatgpt";
      case "chatgpt": return "messenger";
      case "messenger": return "whatsapp";
      default: return "whatsapp";
    }
  });
};
```

## 2. Style Button UI (chat.tsx)
```typescript
<Button
  variant={chatStyle === "whatsapp" ? "whatsapp" : chatStyle === "messenger" ? "messenger" : "ghost"}
  size="icon"
  onClick={toggleChatStyle}
  className={cn(
    "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
    chatStyle === "whatsapp"
      ? "text-white hover:bg-white/10"
      : chatStyle === "messenger"
      ? "text-[#0084ff] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
      : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
  )}
>
  <MessageSquare className="h-4 w-4" />
</Button>
```

## 3. Message Styling (chat-message.tsx)
```typescript
// Different style implementations based on chatStyle prop
if (chatStyle === "chatgpt") {
  return (
    <motion.div
      className={cn(
        "py-8 px-4 md:px-6",
        isUser ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900"
      )}
    >
      // ChatGPT style message content
    </motion.div>
  );
}

if (chatStyle === "messenger") {
  return (
    // Messenger style message content with blue bubbles
  );
}

// Default WhatsApp style
return (
  // WhatsApp style message content with green bubbles
);
```

## 4. Input Styling (chat-input.tsx)
```typescript
<div className={cn(
  "relative flex items-center gap-2 rounded-lg border shadow-lg",
  chatStyle === "whatsapp" 
    ? "bg-white dark:bg-slate-800 border-[#f0f2f5] dark:border-gray-700" 
    : chatStyle === "messenger"
    ? "bg-white dark:bg-slate-800 border-[#eee] dark:border-gray-700"
    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
)}>
```

This code demonstrates how the style switching affects the entire chat interface, from messages to input components, with proper premium user checks and smooth transitions.
