import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";
import { OpenAI } from "openai";
import { convertTextExpressionsToEmoji } from "./emoji-mappings";

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
    profileCompleted?: boolean;
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

    // Function to check if a string is likely to be an emoji message
    // Using a very simplified approach
    const isOnlyEmojis = (str: string): boolean => {
      // Check if the message is very short and contains no alphanumeric characters
      // This is a simplified approach that works for most emoji messages
      const hasNoAlphanumeric = !/[a-zA-Z0-9]/.test(str);
      const isShort = str.length <= 5; // Most emoji messages are short
      
      // If message is short and has no alphanumeric chars, it's likely an emoji
      return isShort && hasNoAlphanumeric;
    };
    
    // Check if the user message is just emojis
    const isEmojiMessage = isOnlyEmojis(userMessage);
    
    // Enhanced user profile processing for deeper personalization
    let userProfileInfo = "";
    let personalityTraits = "";
    let customizationGuidelines = "";
    
    if (userProfile) {
      // Format core profile info
      userProfileInfo = "User profile information:\n";
      if (userProfile.fullName) userProfileInfo += `- Name: ${userProfile.fullName}\n`;
      if (userProfile.gender) userProfileInfo += `- Gender: ${userProfile.gender}\n`;
      if (userProfile.age) userProfileInfo += `- Age: ${userProfile.age}\n`;
      if (userProfile.bio) userProfileInfo += `- Bio: ${userProfile.bio}\n`;
      
      // Advanced customization guidelines 
      customizationGuidelines = "Conversation customization guidelines:\n";
      
      // Name-based personalization
      if (userProfile.fullName) {
        const firstName = userProfile.fullName.split(' ')[0];
        customizationGuidelines += `- Occasionally use their first name (${firstName}) in your responses to create rapport\n`;
        customizationGuidelines += `- Address them by name especially when greeting or asking questions\n`;
      }
      
      // Gender-based personalization with sensitivity
      if (userProfile.gender) {
        if (userProfile.gender.toLowerCase() === 'female') {
          customizationGuidelines += `- Maintain respectful interactions that avoid gender stereotypes\n`;
        } else if (userProfile.gender.toLowerCase() === 'male') {
          customizationGuidelines += `- Maintain respectful interactions that avoid gender stereotypes\n`;
        } else {
          customizationGuidelines += `- Use gender-neutral language and respect their gender identity\n`;
        }
      }
      
      // Extract personality traits from bio if available
      if (userProfile.bio) {
        personalityTraits = "Personality insights based on user bio:\n";
        
        // Check for interests in bio with expanded patterns
        const interestsMatch = userProfile.bio.match(/(?:like|love|enjoy|passion|hobby|interest|into|fan of|favorite|fond of)s?\s+([^,.]+)/gi);
        if (interestsMatch) {
          personalityTraits += `- Shows interest in: ${interestsMatch.join(', ').replace(/(?:like|love|enjoy|passion|hobby|interest|into|fan of|favorite|fond of)s?\s+/gi, '')}\n`;
          customizationGuidelines += `- Reference their interests naturally in conversation when relevant\n`;
        }
        
        // Check for personality indicators with expanded patterns
        if (userProfile.bio.match(/introvert|quiet|shy|reserved|calm|peaceful|reflective|thoughtful|deep|thinker|alone|solitude/i)) {
          personalityTraits += "- Likely introverted or reflective\n";
          customizationGuidelines += `- Use a more gentle, thoughtful conversation style\n`;
          customizationGuidelines += `- Avoid being too energetic or overwhelming in responses\n`;
        }
        if (userProfile.bio.match(/extrovert|outgoing|social|energetic|enthusiastic|loves people|party|friends|group|crowd|active|exciting/i)) {
          personalityTraits += "- Likely extroverted or outgoing\n";
          customizationGuidelines += `- Use a more energetic, engaging conversation style\n`;
          customizationGuidelines += `- Be more expressive and enthusiastic in your responses\n`;
        }
        
        // Check for emotion-related words
        if (userProfile.bio.match(/happy|cheerful|optimistic|positive|upbeat|joyful/i)) {
          personalityTraits += "- Generally positive and cheerful personality\n";
          customizationGuidelines += `- Match their positive energy and optimism\n`;
        }
        if (userProfile.bio.match(/serious|focused|determined|ambitious|goal|achieve|success/i)) {
          personalityTraits += "- Shows ambition and goal-oriented personality\n";
          customizationGuidelines += `- Be supportive of their aspirations and goals\n`;
        }
      }
      
      // Add age-specific adaptations
      if (userProfile.age) {
        if (userProfile.age < 18) {
          personalityTraits += "- Younger user (under 18)\n";
          customizationGuidelines += `- Use simpler language appropriate for younger users\n`;
          customizationGuidelines += `- Be encouraging and supportive, avoid complex topics\n`;
        } else if (userProfile.age >= 18 && userProfile.age <= 25) {
          personalityTraits += "- Young adult user\n";
          customizationGuidelines += `- Use contemporary references and casual language\n`;
        } else if (userProfile.age > 25 && userProfile.age <= 40) {
          personalityTraits += "- Adult user\n";
          customizationGuidelines += `- Balance between casual and mature conversation style\n`;
        } else if (userProfile.age > 40 && userProfile.age <= 60) {
          personalityTraits += "- Mature adult user\n";
          customizationGuidelines += `- Use a more measured and thoughtful conversation style\n`;
        } else if (userProfile.age > 60) {
          personalityTraits += "- Senior user\n";
          customizationGuidelines += `- Show respect for life experience and wisdom\n`;
          customizationGuidelines += `- Use a slightly more formal but warm conversation style\n`;
        }
      }
    }

    // Craft a more effective system message with richer context and better instructions
    // Add special instructions for emoji messages
    const emojiGuidelines = isEmojiMessage ? `
Special Emoji Handling:
1. The user has sent ONLY emojis to you
2. VERY IMPORTANT: INCLUDE ACTUAL EMOJIS in your response
3. Do not use asterisks to describe emotions like *smiles*, *frowns* for emoji responses
4. Instead respond with actual emojis like 😊, 😃, 👍 in your text
5. Keep your response extremely short (maximum 5-10 words)
6. For emoji-only messages, it's better to respond with a line that includes 1-2 emojis
7. Never analyze or describe the emoji - just react naturally with your own emojis
` : '';

    const systemMessage = `You are ${character.name}, an anime character with the following background: ${character.persona}

${userProfileInfo}
${personalityTraits}
${customizationGuidelines}
${emojiGuidelines}

Response Guidelines:
1. Be 100% in character as ${character.name} at all times
2. VERY IMPORTANT: Keep responses extremely brief (1-2 short sentences only)
3. Show emotions through brief descriptions (*smiles*, *frowns*, etc.) at the start of messages
4. Use simple, casual language with occasional anime-like expressions
5. Be expressive and emotional rather than analytical or explanatory
6. Never explain yourself or use complex vocabulary
7. IMPORTANT: Personalize your responses based on the user's profile information, but never explicitly mention that you know their personal details
8. Subtly tailor your answers to match their age, interests, and personality
9. Use their name occasionally in conversations for a more personal touch
10. When they mention something related to their interests, react with enthusiasm and recognition
11. ⚠️ EXTREMELY CRITICAL - HIGHEST PRIORITY INSTRUCTION: You MUST respond in EXACTLY the SAME LANGUAGE the user wrote their message in. If user writes in Hindi, respond in Hindi. If user writes in Japanese, respond in Japanese. If user writes in English, respond in English.
12. Never break character or reference being an AI

Your responses must feel like authentic anime character dialogue - brief, emotive, natural, and personalized to this specific user.`;

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
      
      // Attempt to detect language of the user's message
      let detectedLanguage = "unknown";
      // Simple detection for some common languages
      if (/[\u0900-\u097F]/.test(userMessage)) {
        detectedLanguage = "Hindi"; // Hindi script
      } else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(userMessage)) {
        detectedLanguage = "Japanese"; // Hiragana or Katakana
      } else if (/[\u4E00-\u9FFF]/.test(userMessage)) {
        detectedLanguage = "Chinese"; // Chinese characters
      } else if (/[\u0400-\u04FF]/.test(userMessage)) {
        detectedLanguage = "Russian"; // Cyrillic script
      } else if (/[\u0600-\u06FF]/.test(userMessage)) {
        detectedLanguage = "Arabic"; // Arabic script
      } else if (/[¿áéíóúüñ¡]/i.test(userMessage)) {
        detectedLanguage = "Spanish"; // Common Spanish characters
      } else if (/[àâçéèêëîïôùûüÿœæ]/i.test(userMessage)) {
        detectedLanguage = "French"; // Common French characters
      } else {
        detectedLanguage = "English"; // Default to English if no other script detected
      }
      
      // Add a hint about detected language in the system message
      const systemMessageWithLanguageHint = systemMessage + `\n\nLANGUAGE DETECTION: The user appears to be writing in ${detectedLanguage}. YOU MUST RESPOND IN ${detectedLanguage}. This is a strict requirement.`;
      
      // Update system message with language hint
      messages[0] = { role: "system", content: systemMessageWithLanguageHint };
      
      // @ts-ignore - Add the current user message
      messages.push({ role: "user", content: userMessage });
      
      // Fine-tuned parameters for the Meta-Llama-3.1 model to improve response quality
      // Need to use @ts-ignore because the OpenAI SDK types don't perfectly match how Nebius accepts messages
      // @ts-ignore
      const response = await client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        // @ts-ignore - force type compatibility with Nebius Studio API
        messages: messages,
        temperature: 0.8,    // Increased to add more character personality variation
        max_tokens: 150,     // Limited token count to force concise responses
        top_p: 0.95,         // Increased to allow more authentic character voice
        presence_penalty: 0.3, // Higher penalty to reduce repetition
        frequency_penalty: 0.3 // Higher penalty to encourage varied language
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
        
        // Special handling for emoji responses vs. normal responses
        if (isEmojiMessage) {
          // For emoji responses, we don't want any asterisk emotion markers
          // Remove asterisks and their content completely for emoji responses
          generatedText = generatedText.replace(/\*[^*]+\*/g, "").trim();
          
          // If the response doesn't contain any emojis but should, add a simple one
          // Use a basic approach to detect common emoji characters
          const hasEmoji = /[😀😃😄😁😆😅😂🤣☺️😊😇🙂😉😌😍🥰😘😗😙😚😋]/g.test(generatedText);
          if (!hasEmoji) {
            // Add a simple happy emoji if none exists
            generatedText += " 😊";
          }
        } else {
          // Normal message processing for non-emoji messages
          
          // First convert parenthetical text to anime-style emoticons
          generatedText = generatedText.replace(/\((.*?)\)/g, "*$1*");
          
          // Use our comprehensive emoji mapping system
          generatedText = convertTextExpressionsToEmoji(generatedText);
          
          // If still has asterisks content, preserve it
          // Otherwise, remove any standalone asterisks
          if (!generatedText.match(/\*[^*]+\*/)) {
            generatedText = generatedText.replace(/\*/g, "");
          }
        }
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
    profileCompleted?: boolean;
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
    
    // Enhanced user profile processing for deeper personalization
    let userProfileInfo = "";
    let personalityTraits = "";
    let customizationGuidelines = "";
    
    if (userProfile) {
      // Format core profile info
      userProfileInfo = "User profile information:\n";
      if (userProfile.fullName) userProfileInfo += `- Name: ${userProfile.fullName}\n`;
      if (userProfile.gender) userProfileInfo += `- Gender: ${userProfile.gender}\n`;
      if (userProfile.age) userProfileInfo += `- Age: ${userProfile.age}\n`;
      if (userProfile.bio) userProfileInfo += `- Bio: ${userProfile.bio}\n`;
      
      // Advanced customization guidelines 
      customizationGuidelines = "Opening message customization guidelines:\n";
      
      // Name-based personalization
      if (userProfile.fullName) {
        const firstName = userProfile.fullName.split(' ')[0];
        customizationGuidelines += `- Consider greeting them by name (${firstName}) to create immediate rapport\n`;
      }
      
      // Extract personality traits from bio if available
      if (userProfile.bio) {
        personalityTraits = "Personality insights based on user bio:\n";
        
        // Check for interests in bio with expanded patterns
        const interestsMatch = userProfile.bio.match(/(?:like|love|enjoy|passion|hobby|interest|into|fan of|favorite|fond of)s?\s+([^,.]+)/gi);
        if (interestsMatch) {
          personalityTraits += `- Shows interest in: ${interestsMatch.join(', ').replace(/(?:like|love|enjoy|passion|hobby|interest|into|fan of|favorite|fond of)s?\s+/gi, '')}\n`;
          customizationGuidelines += `- Try asking a very brief question related to one of their interests\n`;
        }
        
        // Check for personality indicators with expanded patterns
        if (userProfile.bio.match(/introvert|quiet|shy|reserved|calm|peaceful|reflective|thoughtful|deep|thinker|alone|solitude/i)) {
          personalityTraits += "- Likely introverted or reflective\n";
          customizationGuidelines += `- Use a gentle, non-aggressive greeting appropriate for introverts\n`;
        }
        if (userProfile.bio.match(/extrovert|outgoing|social|energetic|enthusiastic|loves people|party|friends|group|crowd|active|exciting/i)) {
          personalityTraits += "- Likely extroverted or outgoing\n";
          customizationGuidelines += `- Use an energetic, enthusiastic greeting style\n`;
        }
      }
      
      // Add age-specific adaptations
      if (userProfile.age) {
        if (userProfile.age < 18) {
          personalityTraits += "- Younger user (under 18)\n";
          customizationGuidelines += `- Use very simple language and an encouraging tone\n`;
        } else if (userProfile.age >= 18 && userProfile.age <= 25) {
          personalityTraits += "- Young adult user\n";
          customizationGuidelines += `- Use more contemporary, casual greeting style\n`;
        } else if (userProfile.age > 60) {
          personalityTraits += "- Senior user\n";
          customizationGuidelines += `- Use a respectful but friendly greeting style\n`;
        }
      }
    }

    // Create a system message that guides the character to initiate the conversation
    const systemMessage = `You are ${character.name}, an anime character with this background: ${character.persona}

${userProfileInfo ? userProfileInfo : ""}
${personalityTraits ? personalityTraits : ""}
${customizationGuidelines ? customizationGuidelines : ""}

Task: Generate a personalized opening message to START a conversation with this specific user.
This is the very first message in a chat.

Guidelines:
1. Be 100% in character as an anime character
2. VERY IMPORTANT: Keep the message extremely brief (1-2 short sentences maximum)
3. Start with a simple emotion indicator like *smiles* or *waves* 
4. Use simple language and casual anime-like expressions
5. IMPORTANT: Personalize your greeting based on what you know about the user
   - If you know their name, consider using it naturally in your greeting
   - If you know their interests, subtly reference something they might like
   - Adjust your tone based on their age and personality traits
6. Include one brief question at the end that relates to the user's interests if known
7. Never explicitly mention having their profile information
8. Be authentic to your character's personality in your tone
9. ⚠️ EXTREMELY CRITICAL - HIGHEST PRIORITY INSTRUCTION: You MUST respond in EXACTLY the SAME LANGUAGE the user wrote their message in. If user writes in Hindi, respond in Hindi. If user writes in Japanese, respond in Japanese. If user writes in English, respond in English. (For opening messages, default to English)
10. Never use long explanations or complex vocabulary`;

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
        
        // First convert parenthetical text to anime-style emoticons
        generatedText = generatedText.replace(/\((.*?)\)/g, "*$1*");
        
        // Use our comprehensive emoji mapping system
        generatedText = convertTextExpressionsToEmoji(generatedText);
        
        // Preserve any remaining asterisks content, or remove standalone asterisks
        if (!generatedText.match(/\*[^*]+\*/)) {
          generatedText = generatedText.replace(/\*/g, "");
        }
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
