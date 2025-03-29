import React, { useState } from "react";
import { TypingIndicator } from "./typing-indicator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TestTypingIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);
  const [chatStyle, setChatStyle] = useState<"whatsapp" | "messenger" | "kakao" | "chatgpt">("whatsapp");

  // Toggle the indicator visibility
  const toggleIndicator = () => {
    setShowIndicator(!showIndicator);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center">Typing Indicator Test</h2>
      
      <Tabs defaultValue="whatsapp" className="w-full" onValueChange={(value) => setChatStyle(value as any)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="messenger">Messenger</TabsTrigger>
          <TabsTrigger value="kakao">Kakao</TabsTrigger>
          <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4 border p-4 rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            {showIndicator && <TypingIndicator chatStyle="whatsapp" />}
          </div>
        </TabsContent>
        <TabsContent value="messenger" className="mt-4 border p-4 rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            {showIndicator && <TypingIndicator chatStyle="messenger" />}
          </div>
        </TabsContent>
        <TabsContent value="kakao" className="mt-4 border p-4 rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            {showIndicator && <TypingIndicator chatStyle="kakao" />}
          </div>
        </TabsContent>
        <TabsContent value="chatgpt" className="mt-4 border p-4 rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            {showIndicator && <TypingIndicator chatStyle="chatgpt" />}
          </div>
        </TabsContent>
      </Tabs>
      
      <Button 
        onClick={toggleIndicator}
        className="mt-4"
        variant={showIndicator ? "destructive" : "default"}
      >
        {showIndicator ? "Hide Typing Indicator" : "Show Typing Indicator"}
      </Button>
    </div>
  );
}