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
/**
 * Generates a personalized opening message from a character based on user profile data
 * This is used when a user starts a new conversation with a character
 */
export async function generateOpeningMessage(
  character: Character,
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

    // If no client available, return a generic greeting
    if (!client) {
      console.warn("No API client available for LLM service");
      return `Hello there! I'm ${character.name}. How are you doing today?`;
    }
    
    // Extract user profile information
    let userProfileInfo = "";
    let personalityInsights = "";
    
    if (userProfile) {
      if (userProfile.fullName) userProfileInfo += `- User's name: ${userProfile.fullName}\n`;
      if (userProfile.gender) userProfileInfo += `- Gender: ${userProfile.gender}\n`;
      if (userProfile.age) userProfileInfo += `- Age: ${userProfile.age}\n`;
      if (userProfile.bio) userProfileInfo += `- Bio: ${userProfile.bio}\n`;
      
      // Extract interests and personality traits if bio is available
      if (userProfile.bio) {
        const interestsMatch = userProfile.bio.match(/(?:like|love|enjoy|passion|hobby|interest|into)s?\s+([^,.]+)/gi);
        if (interestsMatch) {
          personalityInsights += `- User appears interested in: ${interestsMatch.join(', ').replace(/(?:like|love|enjoy|passion|hobby|interest|into)s?\s+/gi, '')}\n`;
        }
      }
    }

    // Create a system message that guides the character to initiate the conversation
    const systemMessage = `You are ${character.name}, with this background: ${character.persona}

${userProfileInfo ? "User profile information:\n" + userProfileInfo : ""}
${personalityInsights ? "User personality insights:\n" + personalityInsights : ""}

Task: Generate a natural, friendly opening message to START a conversation with this user. 
This is the very first message in a chat, so introduce yourself briefly and ask a relevant, personalized question.

Guidelines:
1. Be natural and casual, as if starting a real conversation
2. Keep it brief (2-3 sentences maximum)
3. Include a specific question at the end that encourages a response
4. If you have user profile data, use it to personalize your greeting subtly
5. Don't explicitly mention having their profile information
6. If no profile data is available, ask a general but engaging question
7. Match your character's personality and background in your tone and interests
8. Don't use generic greetings like "How can I help you today?"`;

    try {
      // @ts-ignore - We use any[] type to bypass TypeScript's strict checking
      const messages: any[] = [
        { role: "system", content: systemMessage }
      ];

      // @ts-ignore
      const response = await client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        // @ts-ignore
        messages: messages,
        temperature: 0.8,  // Slightly higher temperature for more creative greetings
        max_tokens: 150,   // Keep it concise
        top_p: 0.9,
        presence_penalty: 0.2, // Higher penalty to avoid generic responses
        frequency_penalty: 0.3 // Higher penalty for more unique word choice
      });

      // Process the response
      let generatedText = response.choices[0]?.message?.content?.trim() || "";

      if (generatedText) {
        // Clean up the response to remove AI artifacts
        generatedText = generatedText.replace(/^(Assistant|Character|AI|ChatGPT|As\s+|I'm\s+|This\s+is\s+|[^:]+):\s*/i, "");
        generatedText = generatedText.replace(/^['"]|['"]$/g, "");
        generatedText = generatedText.replace(/^\*|\*$/g, "");
        generatedText = generatedText.replace(/\(.*?\)/g, "");
      }

      return generatedText || `Hey there! I'm ${character.name}. What brings you here today?`;
    } catch (error) {
      console.error("Error generating opening message:", error);
      return `Hello! I'm ${character.name}. ${character.description} How are you doing today?`;
    }
  } catch (error) {
    console.error("Error in opening message generation:", error);
    return `Hi! I'm ${character.name}. Let's chat!`;
  }
}

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
  
  // Test opening message generation
  const openingMessage = await generateOpeningMessage(character);
  console.log("Opening Message:", openingMessage);
}

// Only run main if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => console.error("Error:", err));
}
