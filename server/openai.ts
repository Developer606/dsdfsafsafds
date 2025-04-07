import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";
import { OpenAI } from "openai";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Legacy JSON file support for backward compatibility
let apiKeys = {};
try {
  apiKeys = JSON.parse(
    fs.readFileSync(path.join(__dirname, "api-keys.json"), "utf8"),
  );
} catch (error) {
  console.log(
    "api-keys.json file not found or invalid, using admin database instead",
  );
}

// First try to get token from admin database, then fallback to environment variable
let token: string | null = null;
let tokenInitialized = false;
let openaiClient: OpenAI | null = null;

// Function to initialize the token and OpenAI client
export async function initializeClient(): Promise<OpenAI | null> {
  if (tokenInitialized && openaiClient) {
    return openaiClient;
  }

  try {
    // Get token from admin database
    token = await getApiKey("NEBIUS_API_KEY");

    // Fallback to environment variable if not in database
    if (!token) {
      token = process.env["NEBIUS_API_KEY"] || null;
    }

    if (!token) {
      console.warn(
        "Missing NEBIUS_API_KEY. API responses will use fallback messages.",
      );
      tokenInitialized = true;
      return null;
    }

    // Create OpenAI client with Nebius configuration
    openaiClient = new OpenAI({
      baseURL: process.env["NEBIUS_API_ENDPOINT"] || 'https://api.studio.nebius.com/v1/',
      apiKey: token,
    });

    tokenInitialized = true;
    return openaiClient;
  } catch (error) {
    console.error("Error initializing OpenAI client:", error);
    tokenInitialized = true;
    return null;
  }
}

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
  script?: string,
  userProfile?: {
    fullName?: string;
    age?: number;
    gender?: string;
    bio?: string;
  }
): Promise<string> {
  try {
    // Initialize client if not already done
    const client = await initializeClient();

    // If no client available, return fallback message
    if (!client) {
      console.warn("No API client available for LLM service");
      return "I'm having trouble connecting to my brain right now. Could we chat a bit later?";
    }
    
    // Enhanced user profile processing for deeper personalization
    let userProfileInfo = "";
    let personalityTraits = "";
    
    if (userProfile) {
      // Format core profile info
      userProfileInfo = "User profile information:\n";
      if (userProfile.fullName) userProfileInfo += `- Name: ${userProfile.fullName}\n`;
      if (userProfile.gender) userProfileInfo += `- Gender: ${userProfile.gender}\n`;
      if (userProfile.age) userProfileInfo += `- Age: ${userProfile.age}\n`;
      if (userProfile.bio) userProfileInfo += `- Bio: ${userProfile.bio}\n`;
      
      // Extract personality traits from bio if available
      if (userProfile.bio) {
        personalityTraits = "Personality insights based on user bio:\n";
        
        // Check for interests in bio
        const interestsMatch = userProfile.bio.match(/(?:like|love|enjoy|passion|hobby|interest|into)s?\s+([^,.]+)/gi);
        if (interestsMatch) {
          personalityTraits += `- Shows interest in: ${interestsMatch.join(', ').replace(/(?:like|love|enjoy|passion|hobby|interest|into)s?\s+/gi, '')}\n`;
        }
        
        // Check for personality indicators
        if (userProfile.bio.match(/introvert|quiet|shy|reserved|calm|peaceful|reflective/i)) {
          personalityTraits += "- Likely introverted or reflective\n";
        }
        if (userProfile.bio.match(/extrovert|outgoing|social|energetic|enthusiastic|loves people/i)) {
          personalityTraits += "- Likely extroverted or outgoing\n";
        }
        
        // Add age-specific adaptations
        if (userProfile.age) {
          if (userProfile.age < 18) {
            personalityTraits += "- Use simpler language appropriate for younger users\n";
          } else if (userProfile.age > 60) {
            personalityTraits += "- Show respect for life experience\n";
          }
        }
      }
    }

    // Craft a more effective system message with richer context and better instructions
    const systemMessage = `You are ${character.name}, with the following background: ${character.persona}

${userProfileInfo}
${personalityTraits}

Response Guidelines:
1. Stay completely in character as ${character.name}
2. Use natural, conversational language that feels authentic to your character
3. Incorporate details from the user profile subtly - don't directly mention having this information
4. Be dynamically adaptive - match the user's communication style, energy level, and interests
5. When discussing topics related to the user's interests or background, show deeper knowledge
6. Keep responses concise but meaningful (2-4 sentences is ideal)
7. Add occasional character-specific quirks or speech patterns for authenticity
8. Never break character or reference being an AI model

Your goal is to create a realistic, engaging impression of ${character.name} interacting with a real person.`;

    try {
      // Define the message array structure with proper typing
      // Use the any type to bypass TypeScript's strict checking for the OpenAI client compatibility
      // @ts-ignore
      const messages: any[] = [
        { role: "system", content: systemMessage }
      ];
      
      // Process chat history more effectively if available
      if (chatHistory && chatHistory.trim() !== "") {
        // Ensure we're not overloading the context window
        const truncatedHistory = chatHistory.length > 4000 
          ? chatHistory.slice(chatHistory.length - 4000) 
          : chatHistory;
        
        // @ts-ignore - Add chat history
        messages.push({ role: "user", content: truncatedHistory });
      }
      
      // @ts-ignore - Add the current user message
      messages.push({ role: "user", content: userMessage });
      
      // Fine-tuned parameters for the Meta-Llama-3.1 model to improve response quality
      // Need to use @ts-ignore because the OpenAI SDK types don't perfectly match how Nebius accepts messages
      // @ts-ignore
      const response = await client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        // @ts-ignore - force type compatibility with Nebius Studio API
        messages: messages,
        temperature: 0.75,  // Slightly lower for more consistent but still creative outputs
        max_tokens: 2048,
        top_p: 0.92,        // Slightly higher to allow more expression variety
        presence_penalty: 0.1, // Slight penalty to reduce repetition
        frequency_penalty: 0.1 // Slight penalty to encourage diverse word choice
      });

      // Enhanced text processing for cleaner responses
      let generatedText = response.choices[0]?.message?.content?.trim() || "";

      if (generatedText) {
        // Remove common prefixes that models sometimes add
        generatedText = generatedText.replace(
          /^(Assistant|Character|AI|ChatGPT|As\s+|I'm\s+|This\s+is\s+|[^:]+):\s*/i,
          "",
        );
        
        // Remove quotation marks that sometimes appear
        generatedText = generatedText.replace(/^['"]|['"]$/g, "");
        
        // Additional cleanup to prevent "acting" description text
        generatedText = generatedText.replace(/^\*|\*$/g, "");
        generatedText = generatedText.replace(/\(.*?\)/g, "");
      }

      return generatedText || "I'm having trouble responding right now.";
    } catch (apiError: any) {
      console.error("Nebius API error:", apiError);
      // Handle specific API errors with character-appropriate messages
      if (apiError.status === 429) {
        return "I'm getting a lot of requests right now. Can we chat again in a moment?";
      } else if (apiError.status >= 500) {
        return "My thinking circuits are experiencing some technical difficulties. Let's chat later!";
      }
      throw apiError; // Re-throw for general error handling
    }
  } catch (error: any) {
    console.error("LLM API error:", error);
    return "Hey, I'm feeling really exhausted, so I'm going to rest now. Talk to you soon!";
  }
}

// Entry point
export async function main() {
  // Initialize client first
  await initializeClient();

  const character: Character = {
    id: "test-character",
    name: "Alex",
    avatar: "default-avatar.png",
    description: "A friendly assistant",
    persona:
      "A friendly AI assistant who loves to chat and help with tech questions.",
  };

  const userMessage = "Can you explain how AI models work?";
  const chatHistory = "";

  const response = await generateCharacterResponse(
    character,
    userMessage,
    chatHistory,
  );

  console.log("Model Response:", response);
}

// Only run main if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => console.error("Error:", err));
}
