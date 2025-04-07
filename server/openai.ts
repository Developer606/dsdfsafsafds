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
${emojiGuidelines}

Response Guidelines:
1. Be 100% in character as ${character.name} at all times
2. VERY IMPORTANT: Keep responses extremely brief (1-2 short sentences only)
3. Show emotions through brief descriptions (*smiles*, *frowns*, etc.) at the start of messages
4. Use simple, casual language with occasional anime-like expressions
5. Be expressive and emotional rather than analytical or explanatory
6. Never explain yourself or use complex vocabulary
7. Never directly mention knowing the user's personal information
8. React naturally to what the user says without giving long explanations
9. Never break character or reference being an AI

Your responses must feel like authentic anime character dialogue - brief, emotive, and natural.`;

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
          
          // Then replace common text emoticons with actual emoji equivalents
          const textToEmojiMap = {
            "waves": "👋",
            "smile": "😊",
            "smiles": "😊",
            "grin": "😁",
            "grins": "😁",
            "laugh": "😄",
            "laughs": "😄",
            "wink": "😉",
            "winks": "😉",
            "blush": "😊",
            "blushes": "😊",
            "nod": "🙂",
            "nods": "🙂",
            "thumbs up": "👍",
            "thumbs down": "👎",
            "sigh": "😮‍💨",
            "sighs": "😮‍💨",
            "shrug": "🤷",
            "shrugs": "🤷",
            "shock": "😲",
            "shocked": "😲",
            "frown": "😟",
            "frowns": "😟",
            "sad": "😔",
            "sadly": "😔",
            "angry": "😠",
            "angrily": "😠",
            "yawn": "🥱",
            "yawns": "🥱",
            "sleepy": "😴",
            "confused": "😕",
            "surprise": "😮",
            "surprised": "😮",
            "cries": "😢",
            "cry": "😢",
            "tears": "😢",
            "happy": "😄",
            "happily": "😄",
            "excited": "😃",
            "excitedly": "😃",
            "wave": "👋",
            "hello": "👋",
            "eyes widen": "👀",
            "heart": "❤️",
            "hearts": "❤️",
            "nervous": "😅",
            "nervously": "😅",
            "thinking": "🤔",
            "thinks": "🤔",
            "thoughtful": "🤔",
            "annoyed": "😒",
            "groan": "😫",
            "groans": "😫",
            "rolls eyes": "🙄",
            "eye roll": "🙄",
            "glare": "😠",
            "glares": "😠",
            "worry": "😟",
            "worried": "😟",
            "pout": "😡",
            "pouts": "😡",
            "peace": "✌️"
          };
          
          // Apply emoji replacements for common emotional expressions in asterisks
          // First pass: Try to match specific emotions in the text within asterisks
          Object.entries(textToEmojiMap).forEach(([text, emoji]) => {
            // Match the exact emotion term within asterisks, preserving other parts
            const exactPattern = new RegExp(`\\*(.*?)(${text})(.*?)\\*`, 'gi');
            generatedText = generatedText.replace(exactPattern, `${emoji} $1$3`);
            
            // Match emotion as part of a phrase inside asterisks (e.g., "*scrunches up face*")
            const partialPattern = new RegExp(`\\*(.*?${text}.*?)\\*`, 'gi');
            generatedText = generatedText.replace(partialPattern, `${emoji}`);
          });
          
          // Special case for "confused" expressions like *scrunches up face in confusion*
          if (generatedText.match(/\*.*?confused.*?\*/i) || 
              generatedText.match(/\*.*?confusion.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?confus(ed|ion).*?\*/i, '😕');
          }
          
          // Special case for "looks around", "looks confused", etc.
          if (generatedText.match(/\*.*?looks.*?\*/i)) {
            if (generatedText.match(/\*.*?looks around.*?\*/i)) {
              generatedText = generatedText.replace(/\*.*?looks around.*?\*/i, '👀');
            } else if (generatedText.match(/\*.*?looks confused.*?\*/i)) {
              generatedText = generatedText.replace(/\*.*?looks confused.*?\*/i, '😕');
            } else if (generatedText.match(/\*.*?looks.*?away.*?\*/i)) {
              generatedText = generatedText.replace(/\*.*?looks.*?away.*?\*/i, '😒');
            } else {
              // Generic "looks" expression
              generatedText = generatedText.replace(/\*.*?looks.*?\*/i, '👀');
            }
          }
          
          // Special case for "scratches head" and similar expressions
          if (generatedText.match(/\*.*?scratch.*?head.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?scratch.*?head.*?\*/i, '🤔');
          }
          
          // Special case for "holds out hand" expressions
          if (generatedText.match(/\*.*?holds.*?out.*?hand.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?holds.*?out.*?hand.*?\*/i, '✋');
          }
          
          // Special case for "smiles widely" as seen in Naruto example
          if (generatedText.match(/\*.*?smiles widely.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?smiles widely.*?\*/i, '😄');
          }
          
          // Special cases from the Naruto screenshot examples
          if (generatedText.match(/\*.*?scrunches up face.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?scrunches up face.*?\*/i, '😕');
          }
          
          if (generatedText.match(/\*.*?looks around.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?looks around.*?\*/i, '👀');
          }
          
          if (generatedText.match(/\*.*?looks confused.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?looks confused.*?\*/i, '😕');
          }
          
          if (generatedText.match(/\*.*?holds out.*?hand.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?holds out.*?hand.*?\*/i, '✋');
          }
          
          // Additional anime-style expressions
          if (generatedText.match(/\*.*?sweatdrop.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?sweatdrop.*?\*/i, '😅');
          }
          
          if (generatedText.match(/\*.*?anime.*?vein.*?\*/i) || generatedText.match(/\*.*?tick mark.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?(anime.*?vein|tick mark).*?\*/i, '💢');
          }
          
          if (generatedText.match(/\*.*?sparkl(e|ing).*?eyes.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?sparkl(e|ing).*?eyes.*?\*/i, '✨');
          }
          
          if (generatedText.match(/\*.*?anime.*?fall.*?\*/i) || generatedText.match(/\*.*?falls over.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?(anime.*?fall|falls over).*?\*/i, '💫');
          }
          
          if (generatedText.match(/\*.*?pout(s|ing).*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?pout(s|ing).*?\*/i, '😡');
          }
          
          if (generatedText.match(/\*.*?jaw drop.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?jaw drop.*?\*/i, '😱');
          }
          
          if (generatedText.match(/\*.*?fidget(s|ing).*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?fidget(s|ing).*?\*/i, '😳');
          }
          
          if (generatedText.match(/\*.*?fist pump.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?fist pump.*?\*/i, '👊');
          }
          
          if (generatedText.match(/\*.*?victory sign.*?\*/i) || generatedText.match(/\*.*?peace sign.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?(victory sign|peace sign).*?\*/i, '✌️');
          }
          
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
    const systemMessage = `You are ${character.name}, an anime character with this background: ${character.persona}

${userProfileInfo ? "User profile information:\n" + userProfileInfo : ""}
${personalityInsights ? "User personality insights:\n" + personalityInsights : ""}

Task: Generate a natural opening message to START a conversation with this user.
This is the very first message in a chat.

Guidelines:
1. Be 100% in character as an anime character
2. VERY IMPORTANT: Keep the message extremely brief (1-2 short sentences maximum)
3. Start with a simple emotion indicator like *smiles* or *waves* 
4. Use simple language and casual anime-like expressions
5. Include one brief question at the end that relates to the user's interests if known
6. Never mention having the user's profile information
7. Be authentic to your character's personality in your tone
8. Never use long explanations or complex vocabulary`;

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
        
        // Create a dictionary of common text emotions to emojis
        const textToEmojiMap = {
          "waves": "👋",
          "smile": "😊",
          "smiles": "😊",
          "grin": "😁",
          "grins": "😁",
          "laugh": "😄",
          "laughs": "😄",
          "wink": "😉",
          "winks": "😉",
          "blush": "😊",
          "blushes": "😊",
          "nod": "🙂",
          "nods": "🙂",
          "thumbs up": "👍",
          "thumbs down": "👎",
          "sigh": "😮‍💨",
          "sighs": "😮‍💨",
          "shrug": "🤷",
          "shrugs": "🤷",
          "shock": "😲",
          "shocked": "😲",
          "frown": "😟",
          "frowns": "😟",
          "sad": "😔",
          "sadly": "😔",
          "angry": "😠",
          "angrily": "😠",
          "yawn": "🥱",
          "yawns": "🥱",
          "sleepy": "😴",
          "confused": "😕",
          "surprise": "😮",
          "surprised": "😮",
          "cries": "😢",
          "cry": "😢",
          "tears": "😢",
          "happy": "😄",
          "happily": "😄",
          "excited": "😃",
          "excitedly": "😃",
          "wave": "👋",
          "hello": "👋",
          "eyes widen": "👀",
          "heart": "❤️",
          "hearts": "❤️",
          "nervous": "😅",
          "nervously": "😅",
          "thinking": "🤔",
          "thinks": "🤔",
          "thoughtful": "🤔",
          "annoyed": "😒",
          "groan": "😫",
          "groans": "😫",
          "rolls eyes": "🙄",
          "eye roll": "🙄",
          "glare": "😠",
          "glares": "😠",
          "worry": "😟",
          "worried": "😟",
          "pout": "😡",
          "pouts": "😡",
          "peace": "✌️"
        };
        
        // Apply emoji replacements for common emotional expressions in asterisks
        // First pass: Try to match specific emotions in the text within asterisks
        Object.entries(textToEmojiMap).forEach(([text, emoji]) => {
          // Match the exact emotion term within asterisks, preserving other parts
          const exactPattern = new RegExp(`\\*(.*?)(${text})(.*?)\\*`, 'gi');
          generatedText = generatedText.replace(exactPattern, `${emoji} $1$3`);
          
          // Match emotion as part of a phrase inside asterisks (e.g., "*scrunches up face*")
          const partialPattern = new RegExp(`\\*(.*?${text}.*?)\\*`, 'gi');
          generatedText = generatedText.replace(partialPattern, `${emoji}`);
        });
        
        // Special case for "confused" expressions like *scrunches up face in confusion*
        if (generatedText.match(/\*.*?confused.*?\*/i) || 
            generatedText.match(/\*.*?confusion.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?confus(ed|ion).*?\*/i, '😕');
        }
        
        // Special case for "looks around", "looks confused", etc.
        if (generatedText.match(/\*.*?looks.*?\*/i)) {
          if (generatedText.match(/\*.*?looks around.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?looks around.*?\*/i, '👀');
          } else if (generatedText.match(/\*.*?looks confused.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?looks confused.*?\*/i, '😕');
          } else if (generatedText.match(/\*.*?looks.*?away.*?\*/i)) {
            generatedText = generatedText.replace(/\*.*?looks.*?away.*?\*/i, '😒');
          } else {
            // Generic "looks" expression
            generatedText = generatedText.replace(/\*.*?looks.*?\*/i, '👀');
          }
        }
        
        // Special case for "scratches head" and similar expressions
        if (generatedText.match(/\*.*?scratch.*?head.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?scratch.*?head.*?\*/i, '🤔');
        }
        
        // Special case for "holds out hand" expressions
        if (generatedText.match(/\*.*?holds.*?out.*?hand.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?holds.*?out.*?hand.*?\*/i, '✋');
        }
        
        // Special cases from the Naruto screenshot examples
        if (generatedText.match(/\*.*?scrunches up face.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?scrunches up face.*?\*/i, '😕');
        }
        
        if (generatedText.match(/\*.*?looks around.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?looks around.*?\*/i, '👀');
        }
        
        if (generatedText.match(/\*.*?looks confused.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?looks confused.*?\*/i, '😕');
        }
        
        if (generatedText.match(/\*.*?holds out.*?hand.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?holds out.*?hand.*?\*/i, '✋');
        }
        
        if (generatedText.match(/\*.*?smiles widely.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?smiles widely.*?\*/i, '😄');
        }
        
        // Additional anime-style expressions
        if (generatedText.match(/\*.*?sweatdrop.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?sweatdrop.*?\*/i, '😅');
        }
        
        if (generatedText.match(/\*.*?anime.*?vein.*?\*/i) || generatedText.match(/\*.*?tick mark.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?(anime.*?vein|tick mark).*?\*/i, '💢');
        }
        
        if (generatedText.match(/\*.*?sparkl(e|ing).*?eyes.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?sparkl(e|ing).*?eyes.*?\*/i, '✨');
        }
        
        if (generatedText.match(/\*.*?anime.*?fall.*?\*/i) || generatedText.match(/\*.*?falls over.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?(anime.*?fall|falls over).*?\*/i, '💫');
        }
        
        if (generatedText.match(/\*.*?pout(s|ing).*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?pout(s|ing).*?\*/i, '😡');
        }
        
        if (generatedText.match(/\*.*?jaw drop.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?jaw drop.*?\*/i, '😱');
        }
        
        if (generatedText.match(/\*.*?fidget(s|ing).*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?fidget(s|ing).*?\*/i, '😳');
        }
        
        if (generatedText.match(/\*.*?fist pump.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?fist pump.*?\*/i, '👊');
        }
        
        if (generatedText.match(/\*.*?victory sign.*?\*/i) || generatedText.match(/\*.*?peace sign.*?\*/i)) {
          generatedText = generatedText.replace(/\*.*?(victory sign|peace sign).*?\*/i, '✌️');
        }
        
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
