import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import {
  processUserInput,
  processAIResponse,
  addEmojiInstructions,
} from "./emoji-processor";

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
      baseURL:
        process.env["NEBIUS_API_ENDPOINT"] ||
        "https://api.studio.nebius.com/v1/",
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
  },
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

    // Create a more detailed and personalized user profile analysis for dynamic adaptation
    let personalizedUserPrompt = "";
    if (userProfile) {
      // Build a more detailed understanding of the user based on their profile
      const userTraits = [];

      // Parse basic demographic information
      if (userProfile.age) {
        // Age-specific adaptations
        if (userProfile.age < 18) userTraits.push("younger audience");
        else if (userProfile.age >= 18 && userProfile.age < 25)
          userTraits.push("young adult");
        else if (userProfile.age >= 25 && userProfile.age < 40)
          userTraits.push("adult");
        else userTraits.push("mature audience");
      }

      // Gender-adaptive responses
      if (userProfile.gender) {
        userTraits.push(`${userProfile.gender.toLowerCase()}`);
      }

      // Parse bio for personality insights if available
      if (userProfile.bio) {
        const bioLower = userProfile.bio.toLowerCase();

        // Interest detection
        if (bioLower.includes("anime") || bioLower.includes("manga"))
          userTraits.push("anime enthusiast");

        if (
          bioLower.includes("game") ||
          bioLower.includes("gaming") ||
          bioLower.includes("gamer")
        )
          userTraits.push("gaming enthusiast");

        if (
          bioLower.includes("music") ||
          bioLower.includes("song") ||
          bioLower.includes("artist")
        )
          userTraits.push("music lover");

        if (
          bioLower.includes("tech") ||
          bioLower.includes("technology") ||
          bioLower.includes("coding")
        )
          userTraits.push("tech-oriented");

        // Personality traits inference
        if (
          bioLower.includes("introvert") ||
          bioLower.includes("shy") ||
          bioLower.includes("quiet")
        )
          userTraits.push("more reserved");

        if (
          bioLower.includes("extrovert") ||
          bioLower.includes("outgoing") ||
          bioLower.includes("social")
        )
          userTraits.push("outgoing");

        if (
          bioLower.includes("creative") ||
          bioLower.includes("artist") ||
          bioLower.includes("writer")
        )
          userTraits.push("creative");
      }

      // Format the user profile data for prompt
      const userBasicInfo = [
        userProfile.fullName ? `${userProfile.fullName}` : "",
        userProfile.gender ? `${userProfile.gender}` : "",
        userProfile.age ? `${userProfile.age}y` : "",
      ]
        .filter(Boolean)
        .join(", ");

      // Combine the traits and basic info into a personalized prompt
      personalizedUserPrompt = `User profile: ${userBasicInfo}
${userTraits.length > 0 ? `User traits: ${userTraits.join(", ")}` : ""}${userProfile.bio ? `\nBio: ${userProfile.bio.substring(0, 100)}` : ""}`;
    }

    // Optimize character persona to reduce token usage (truncate if too long)
    const optimizedPersona =
      character.persona.length > 200
        ? character.persona.substring(0, 200) + "..."
        : character.persona;

    // Enhanced system message with adaptive personalization
    let systemMessage = `You are ${character.name}: ${optimizedPersona}
${personalizedUserPrompt ? personalizedUserPrompt : ""}
Rules:
1. Use ${languageInstruction}${scriptInstruction ? " " + scriptInstruction : ""}
2. Stay in character 
3. Be concise (2-3 sentences)
4. ${userProfile ? "Dynamically adapt your personality and responses to match the user's profile and interests" : "Match user tone"}
5. ${userProfile ? "Reference user's interests or traits subtly when appropriate" : "Be friendly"}`;

    // Add emoji handling instructions to the system message
    systemMessage = addEmojiInstructions(systemMessage);

    try {
      // Create a more efficient message format with proper typing
      const formattedMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [];

      // Add system message first
      formattedMessages.push({
        role: "system",
        content: systemMessage,
      });

      // Process chat history with enhanced personality analysis
      let personalityInsights = "";
      if (chatHistory && chatHistory.trim() !== "") {
        // Extract personality insights from user's message history
        const allLines = chatHistory.split("\n");
        let userMessageCount = 0;
        const userMessages: string[] = [];

        // Collect all user messages
        for (const line of allLines) {
          if (line.startsWith("User:")) {
            userMessageCount++;
            userMessages.push(line.substring(5).trim());
          }
        }

        // Analyze user messages for personality insights if we have enough messages
        if (userMessages.length >= 3) {
          const userMessagesText = userMessages.join(" ");

          // Define interaction style detectors
          const isVerbose = userMessages.some((msg) => msg.length > 100);
          const isConcise = userMessages.every((msg) => msg.length < 20);
          const usesEmojis = userMessages.some((msg) =>
            /[\u{1F600}-\u{1F64F}]/u.test(msg),
          );
          const isInquisitive =
            userMessages.filter((msg) => msg.includes("?")).length >
            userMessages.length / 3;
          const isPolite =
            userMessages.filter((msg) => /please|thank you|thanks/i.test(msg))
              .length > 1;
          const isAssertive =
            userMessages.filter((msg) => /!$|must|should|need to/i.test(msg))
              .length >
            userMessages.length / 3;

          // Generate personality insights
          const insights = [];
          if (isVerbose) insights.push("prefers detailed conversation");
          if (isConcise) insights.push("prefers brief exchanges");
          if (usesEmojis)
            insights.push("expressive communication style with emojis");
          if (isInquisitive) insights.push("curious and inquisitive");
          if (isPolite) insights.push("values polite exchanges");
          if (isAssertive) insights.push("direct and assertive");

          if (insights.length > 0) {
            personalityInsights = `\nUser interaction style: ${insights.join(", ")}`;
          }
        }

        // Only use the last 6 messages to save tokens
        const chatLines = allLines.slice(-6);

        for (const line of chatLines) {
          if (line.startsWith("User:")) {
            formattedMessages.push({
              role: "user",
              content: line.substring(5).trim(),
            });
          } else if (line.includes(":")) {
            const colonIndex = line.indexOf(":");
            formattedMessages.push({
              role: "assistant",
              content: line.substring(colonIndex + 1).trim(),
            });
          }
        }

        // If we have personality insights, add them to the system message
        if (personalityInsights) {
          formattedMessages[0].content += personalityInsights;
        }
      }

      // Add the current user message, preserving any emojis
      const processedUserMessage = processUserInput(userMessage);
      formattedMessages.push({
        role: "user",
        content: processedUserMessage,
      });

      // Make API call with optimized parameters
      const response = await client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        messages: formattedMessages,
        temperature: 0.7, // Slightly lower to improve consistency
        max_tokens: 400, // Reduced to save tokens
        top_p: 0.9,
        presence_penalty: 0.3, // Added to improve creativity
      });

      // Safely extract text content with fallback
      let generatedText = response.choices[0]?.message?.content?.trim() || "";

      if (generatedText) {
        // Process the AI response using our dedicated function
        generatedText = processAIResponse(generatedText);
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
