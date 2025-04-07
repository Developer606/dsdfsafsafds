import { initializeClient, generateCharacterResponse } from './server/openai.js';

async function testNebiusLLM() {
  console.log("Testing Nebius LLM integration...");
  
  try {
    // Initialize the OpenAI client with Nebius configuration
    const client = await initializeClient();
    
    if (!client) {
      console.error("Failed to initialize Nebius client. Check your API key.");
      return;
    }
    
    console.log("Client initialized successfully.");
    
    // Create a test character
    const testCharacter = {
      id: "test-character",
      name: "Yuki",
      avatar: "yuki-avatar.png",
      description: "A friendly anime character who loves technology",
      persona: "A cheerful anime girl who is passionate about technology and helping others. She's knowledgeable about computers and AI, and has a playful personality."
    };
    
    // Test in different languages
    const languages = ["english", "japanese", "chinese", "hindi"];
    
    for (const language of languages) {
      console.log(`\n=== Testing response in ${language} ===`);
      
      const userMessage = language === "english" ? "Tell me about yourself!" : 
                         language === "japanese" ? "自己紹介してください！" :
                         language === "chinese" ? "请介绍一下你自己！" :
                         "अपने बारे में बताओ!"; // Hindi
      
      console.log(`User: ${userMessage}`);
      
      const response = await generateCharacterResponse(
        testCharacter,
        userMessage,
        "", // No chat history
        language
      );
      
      console.log(`Yuki (${language}): ${response}`);
    }
    
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

testNebiusLLM()
  .then(() => console.log("\nTest completed."))
  .catch(error => console.error("Test failed:", error));