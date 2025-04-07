import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";
import fetch from "node-fetch";

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

// Function to initialize the token
async function initializeToken(): Promise<string | null> {
  if (tokenInitialized) {
    return token;
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
    }

    tokenInitialized = true;
    return token;
  } catch (error) {
    console.error("Error initializing token:", error);
    tokenInitialized = true;
    return null;
  }
}

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
  language: string = "english",
  script?: string,
): Promise<string> {
  try {
    // Initialize token if not already done
    const currentToken = await initializeToken();

    // If no token available, return fallback message
    if (!currentToken) {
      console.warn("No API token available for LLM service");
      return "I'm having trouble connecting to my brain right now. Could we chat a bit later?";
    }

    const NEBIUS_API_URL = "https://llm.api.nebius.cloud/v1/chat/completions";

    const scriptInstruction =
      language === "hindi" && script === "latin"
        ? "Respond in Hindi but use Latin alphabet (include Devanagari in parentheses)."
        : "";

    const languageInstructions: Record<string, string> = {
      english: "Respond naturally in English.",
      hindi: "हिंदी में स्वाभाविक रूप से जवाब दें। Keep responses concise.",
      japanese:
        "自然な日本語で応答してください。敬語を適切に使用してください。",
      chinese: "用自然的中文回应。注意使用适当的敬语。",
      korean: "자연스러운 한국어로 대답해주세요. 존댓말을 적절히 사용해주세요.",
      spanish:
        "Responde naturalmente en español. Usa el nivel de formalidad apropiado.",
      french:
        "Répondez naturellement en français. Utilisez le niveau de formalité approprié.",
    };

    const languageInstruction =
      languageInstructions[language as keyof typeof languageInstructions] ||
      languageInstructions.english;

    // Define message type for the API
    type MessageRole = "system" | "user" | "assistant";
    
    interface ChatMessage {
      role: MessageRole;
      content: string;
    }

    // Format the system message with character details
    const systemMessage = `You are ${character.name}, with this background: ${character.persona}
Instructions:
1. ${languageInstruction}
2. ${scriptInstruction}
3. Stay in character
4. Be concise (2-3 sentences)
5. Match conversation tone`;

    // Build messages array with chat history if available
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage },
    ];
    
    // Add chat history if available
    if (chatHistory && chatHistory.trim() !== "") {
      // Parse chat history if it's in a specific format, or just add as context
      // This implementation might need to be adjusted based on your chat history format
      messages.push({ role: "user", content: chatHistory });
    }
    
    // Add the current user message
    messages.push({ role: "user", content: userMessage });

    // Make API call to Nebius Studio
    const response = await fetch(NEBIUS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${currentToken}`,
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        messages: messages,
        temperature: 0.8,
        max_tokens: 2048,
        top_p: 0.1,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Nebius API error: ${response.status} - ${errorDetails}`);
    }

    // Define the response structure
    interface NebiusResponse {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    }

    const responseData = await response.json() as NebiusResponse;

    // Safely extract text content with fallback
    let generatedText = responseData.choices?.[0]?.message?.content?.trim() || "";

    if (generatedText) {
      generatedText = generatedText.replace(
        /^(Assistant|Character|[^:]+):\s*/i,
        "",
      );
      generatedText = generatedText.replace(/^['"]|['"]$/g, "");
    }

    return generatedText || "I'm having trouble responding right now.";
  } catch (error: any) {
    console.error("LLM API error:", error);
    return "Hey, I'm feeling really exhausted, so I'm going to rest now. Talk to you soon!";
  }
}

// Entry point
export async function main() {
  // Initialize token first
  await initializeToken();

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
