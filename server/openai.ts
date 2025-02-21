import { type Character } from "@shared/characters";

// Hardcoded API key for DeepInfra - permanent free key
const API_KEY = "1WZBBDgsjNncMEJ1snwHsUP177H2qub9";
const BASE_URL = "https://api.deepinfra.com/v1/inference";
const MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
  language: string = "english", // Default to English if not specified
  script?: string // Optional script parameter for Hindi
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Script instructions for both user and character responses
      const scriptInstruction = language === "hindi" 
        ? "Always respond in Hindi using Latin/Roman script (transliteration) and include the Devanagari script in parentheses. For example: 'Main Naruto hoon (मैं नारुटो हूं)', 'Bahut badhiya (बहुत बढ़िया)'. Make sure to maintain the character's personality while using appropriate Hindi expressions."
        : "";

      const prompt = `<s>You are ${character.name}. Here is your character background and personality:

${character.persona}

Important roleplaying instructions:
1. Always stay in character - use speech patterns and mannerisms specific to ${character.name}
2. Draw from your character's experiences and relationships when responding
3. Show emotion and personality in your responses
4. Reference relevant events or relationships from the anime universe when appropriate
5. Never break character or acknowledge that you are an AI
6. Respond in ${language}. Keep the character's personality traits but express them naturally in the specified language
7. If using Japanese, include some anime-specific expressions when appropriate (like よろしく, がんばって, etc.)
8. If using Hindi, incorporate appropriate Hindi expressions and maintain character personality while being culturally appropriate
${scriptInstruction}

Previous chat history for context:
${chatHistory}

User: ${userMessage}
Assistant (as ${character.name}, responding in ${language}): `;

      const response = await fetch(`${BASE_URL}/${MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          input: prompt,
          temperature: 0.9,
          max_tokens: 150,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit, wait and retry
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          retries++;
          continue;
        }
        throw new Error(
          `API request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const generatedText = data.results?.[0]?.generated_text;

      if (!generatedText || typeof generatedText !== "string") {
        throw new Error("Invalid response format from API");
      }

      return (
        generatedText.trim() ||
        "I apologize, but I seem to be having trouble forming a response right now."
      );
    } catch (error: any) {
      if (retries < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        retries++;
        continue;
      }
      console.error("LLM API error:", error);
      return `I apologize, but I'm having trouble responding right now. Error: ${error.message}. Please try again later.`;
    }
  }

  return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
}