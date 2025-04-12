/**
 * Message configuration for AI interactions
 * This file contains settings and utilities to optimize message handling
 */

import { type Character } from "@shared/characters";
import { addEmojiInstructions } from "./emoji-processor";

// Language instructions with concise prompts
const languageInstructions: Record<string, string> = {
  english: "Respond naturally in English.",
  hindi: "हिंदी में स्वाभाविक रूप से जवाब दें।",
  japanese: "自然な日本語で応答してください。",
  chinese: "用自然的中文回应。",
  korean: "자연스러운 한국어로 대답해주세요。",
  spanish: "Responde naturalmente en español.",
  french: "Répondez naturellement en français.",
};

// Script instructions for different writing styles
const scriptInstructions: Record<string, string> = {
  normal: "Use standard writing style.",
  casual: "Use casual, conversational writing.",
  formal: "Use formal, polite language.",
  anime: "Use anime-inspired expressions and mannerisms.",
  poetic: "Use poetic, descriptive language.",
};

/**
 * Extract the most relevant user profile information
 * This optimizes the amount of user data sent to the API
 * 
 * @param userProfile User profile data
 * @returns Concise user profile information string
 */
export function extractUserProfile(userProfile: any): string {
  if (!userProfile) return "";
  
  const relevantFields = [];
  
  // Only include non-empty fields that are most relevant for personalization
  if (userProfile.fullName) relevantFields.push(`Name: ${userProfile.fullName}`);
  if (userProfile.gender) relevantFields.push(`Gender: ${userProfile.gender}`);
  if (userProfile.age) relevantFields.push(`Age: ${userProfile.age}`);
  
  // Include bio only if it's relatively short to save tokens
  if (userProfile.bio && userProfile.bio.length < 50) {
    relevantFields.push(`Bio: ${userProfile.bio}`);
  } else if (userProfile.bio) {
    // Extract key information from longer bios
    const bioSummary = userProfile.bio.substring(0, 50) + "...";
    relevantFields.push(`Bio: ${bioSummary}`);
  }
  
  return relevantFields.length > 0 
    ? "User: " + relevantFields.join("; ") 
    : "";
}

/**
 * Creates an optimized system message for AI character interactions
 * Focuses on essential instructions and personalization
 * 
 * @param character Character information
 * @param userProfile User profile information
 * @param language Language preference
 * @param script Writing style preference
 * @returns Optimized system message
 */
export function createSystemMessage(
  character: Character, 
  userProfile: any, 
  language: string = "english",
  script: string = "normal"
): string {
  // Get language instruction or default to English
  const languageInstruction = 
    languageInstructions[language as keyof typeof languageInstructions] || 
    languageInstructions.english;
  
  // Get script instruction or default to normal
  const scriptInstruction = 
    scriptInstructions[script as keyof typeof scriptInstructions] || 
    scriptInstructions.normal;
  
  // Extract relevant user profile info in concise format
  const userProfileInfo = extractUserProfile(userProfile);
  
  // Create concise system message with essential instructions only
  let systemMessage = `Character: ${character.name}
Persona: ${character.persona}
${userProfileInfo ? userProfileInfo : ""}
Instructions: ${languageInstruction} ${scriptInstruction} Stay in character. Be concise (2-3 sentences). ${userProfileInfo ? "Personalize for this user." : "Be friendly."}`;

  // Add emoji handling instructions
  return addEmojiInstructions(systemMessage);
}

/**
 * Optimizes chat history to reduce token count
 * This ensures only the most relevant context is preserved
 * 
 * @param chatHistory Full chat history
 * @param maxMessages Maximum number of messages to include
 * @param maxTokensPerMessage Maximum tokens per message to include
 * @returns Optimized chat history string
 */
export function optimizeChatHistory(
  chatHistory: string, 
  maxMessages: number = 5,
  maxTokensPerMessage: number = 100
): string {
  if (!chatHistory || chatHistory.trim() === "") return "";
  
  // Split chat history into individual messages
  const messages = chatHistory.split(/\n(?=User:|Character:)/);
  
  // Keep only the most recent messages
  const recentMessages = messages.slice(-maxMessages);
  
  // Truncate each message to limit tokens
  const truncatedMessages = recentMessages.map(message => {
    // Rough approximation: 1 token ≈ 4 characters
    const maxChars = maxTokensPerMessage * 4;
    
    // Check if message is longer than threshold
    if (message.length > maxChars) {
      // Preserve message prefix (User: or Character:)
      const prefix = message.substring(0, message.indexOf(':') + 1);
      const content = message.substring(message.indexOf(':') + 1);
      
      // Truncate content part only
      return prefix + content.substring(0, maxChars) + "...";
    }
    
    return message;
  });
  
  return truncatedMessages.join("\n");
}

/**
 * Creates optimized message array for the AI API
 * This reduces token count while maintaining conversation context
 * 
 * @param systemMessage System message with instructions
 * @param chatHistory Previous conversation history
 * @param userMessage Current user message
 * @returns Optimized messages array
 */
export function createOptimizedMessages(
  systemMessage: string,
  chatHistory: string,
  userMessage: string
): Array<{role: string, content: string}> {
  // Start with system message
  const messages = [{ role: "system", content: systemMessage }];
  
  // Add optimized chat history if available
  if (chatHistory && chatHistory.trim() !== "") {
    const optimizedHistory = optimizeChatHistory(chatHistory);
    messages.push({ role: "user", content: optimizedHistory });
  }
  
  // Add current user message
  messages.push({ role: "user", content: userMessage });
  
  return messages;
}

/**
 * Enhances the AI response for increased personalization
 * 
 * @param response Raw AI response text
 * @param character Character information for personalization
 * @param userProfile User profile for targeted enhancement
 * @returns Enhanced personalized response
 */
export function enhanceResponse(
  response: string,
  character: Character,
  userProfile: any
): string {
  if (!response) return response;
  
  // Clean up any character or assistant prefixes
  let enhanced = response.replace(/^(Assistant|Character|[^:]+):\s*/i, "");
  
  // Remove surrounding quotes if present
  enhanced = enhanced.replace(/^['"]|['"]$/g, "");
  
  // Ensure character name isn't used unnecessarily in third person
  const characterNameRegex = new RegExp(`${character.name}\\s+says`, "gi");
  enhanced = enhanced.replace(characterNameRegex, "I say");
  
  return enhanced;
}