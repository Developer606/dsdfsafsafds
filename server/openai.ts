import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";
import { OpenAI } from "openai";

// Emoji mapping for common expressions found inside asterisks
const emojiMap: Record<string, string> = {
  // Basic emotions
  "smile": "😊",
  "grin": "😁",
  "laugh": "😂",
  "joy": "😄",
  "sigh": "😔",
  "sad": "😢",
  "cry": "😢",
  "tears": "😭",
  "sob": "😭",
  "angry": "😠",
  "mad": "😡",
  "furious": "🤬",
  "frown": "🙁",
  "worried": "😟",
  "nervous": "😬",
  "anxious": "😰",
  "scared": "😨",
  "terrified": "😱",
  "confused": "😕",
  "surprised": "😮",
  "shocked": "😲",
  "amazed": "😲",
  "disappointed": "😞",
  "relieved": "😌",
  "satisfied": "😌",
  "sleepy": "😴",
  "tired": "😫",
  "exhausted": "😩",
  "yawn": "🥱",
  "blush": "😊",
  "embarrassed": "😳",
  "thinking": "🤔",
  "thoughtful": "🤔",
  "neutral": "😐",
  "indifferent": "😐",
  "rolling eyes": "🙄",
  "eye roll": "🙄",
  "wink": "😉",
  "smirk": "😏",
  "tongue": "😛",
  "tongue out": "😋",
  "drool": "🤤",
  "excited": "🤩",
  "heart eyes": "😍",
  "love": "❤️",
  "heart": "❤️",
  "thumbs up": "👍",
  "thumbs down": "👎",
  "clap": "👏",
  "shrug": "🤷",
  "face palm": "🤦",
  "facepalm": "🤦",
  "sweat": "😅",
  "sweet": "🥰",
  "hug": "🤗"
};

// Function to convert text inside asterisks to emojis
function convertAsteriskTextToEmojis(text: string): string {
  // Regular expression to match text inside asterisks: *text*
  const asteriskPattern = /\*([^*]+)\*/g;
  
  return text.replace(asteriskPattern, (match, textInsideAsterisks) => {
    // Convert to lowercase for matching
    const lowerCaseText = textInsideAsterisks.toLowerCase().trim();
    
    // Check if there's a matching emoji in our map
    for (const [expression, emoji] of Object.entries(emojiMap)) {
      if (lowerCaseText.includes(expression)) {
        return emoji; // Replace with appropriate emoji
      }
    }
    
    // If no match found, keep the original text but remove asterisks
    return textInsideAsterisks;
  });
}

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
  language: string = "english",
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
    
    // Add user profile information if available
    let userProfileInfo = "";
    if (userProfile) {
      userProfileInfo = "User profile information:\n";
      if (userProfile.fullName) userProfileInfo += `- Name: ${userProfile.fullName}\n`;
      if (userProfile.gender) userProfileInfo += `- Gender: ${userProfile.gender}\n`;
      if (userProfile.age) userProfileInfo += `- Age: ${userProfile.age}\n`;
      if (userProfile.bio) userProfileInfo += `- Bio: ${userProfile.bio}\n`;
    }

    // Format the system message with character details and user profile
    const systemMessage = `You are ${character.name}, with this background: ${character.persona}
${userProfileInfo ? userProfileInfo : ""}
Instructions:
1. ${languageInstruction}
2. ${scriptInstruction}
3. Stay in character
4. Be concise (2-3 sentences)
5. Match conversation tone
6. ${userProfileInfo ? "Use the user profile information to personalize your responses" : "Respond in a friendly manner"}`;

    try {
      // @ts-ignore - TypeScript doesn't fully recognize the OpenAI API message types
      const messages = [
        { role: 'system', content: systemMessage }
      ];
      
      // Add chat history if available
      if (chatHistory && chatHistory.trim() !== "") {
        // @ts-ignore - TypeScript doesn't fully recognize the OpenAI API message types
        messages.push({ role: 'user', content: chatHistory });
      }
      
      // Add the current user message
      // @ts-ignore - TypeScript doesn't fully recognize the OpenAI API message types
      messages.push({ role: 'user', content: userMessage });
      
      // Make API call to Nebius Studio using OpenAI client
      // @ts-ignore - The OpenAI SDK types don't match exactly with how Nebius Studio accepts messages
      const response = await client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        messages: messages,
        temperature: 0.8, 
        max_tokens: 2048,
        top_p: 0.9
      });

      // Safely extract text content with fallback
      let generatedText = response.choices[0]?.message?.content?.trim() || "";

      if (generatedText) {
        // Clean up prefix patterns like "Character:" or "Assistant:"
        generatedText = generatedText.replace(
          /^(Assistant|Character|[^:]+):\s*/i,
          "",
        );
        // Remove starting and ending quotes if present
        generatedText = generatedText.replace(/^['"]|['"]$/g, "");
        
        // Convert text inside asterisks to emojis
        generatedText = convertAsteriskTextToEmojis(generatedText);
      }

      return generatedText || "I'm having trouble responding right now.";
    } catch (apiError: any) {
      console.error("Nebius API error:", apiError);
      // Handle specific API errors
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
