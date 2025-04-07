#!/usr/bin/env node

import { generateCharacterResponse } from "./server/openai";

console.log("Testing Nebius Studio with Meta-Llama-3.1-8B-Instruct model...");
console.log("This will attempt to generate a response using the test character.");
console.log("Make sure you have set the NEBIUS_API_KEY environment variable or added it to the admin database.");

async function testNebiusLLM() {
  try {
    // Create a test character
    const character = {
      id: "test-character",
      name: "Alex",
      avatar: "default-avatar.png",
      description: "A friendly assistant",
      persona: "A friendly AI assistant who loves to chat and help with tech questions.",
    };

    // Generate a response
    const userMessage = "Can you explain how AI models work?";
    const chatHistory = "";
    
    console.log("Sending request to Nebius Studio...");
    const response = await generateCharacterResponse(
      character,
      userMessage,
      chatHistory,
    );
    
    console.log("\nModel Response from Nebius Studio:");
    console.log("------------------------------------");
    console.log(response);
    console.log("------------------------------------");
  } catch (error) {
    console.error("Error testing Nebius LLM:", error);
  }
}

testNebiusLLM();