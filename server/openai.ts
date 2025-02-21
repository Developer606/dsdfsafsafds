import { type Character } from "@shared/characters";

// Hardcoded API key for DeepInfra - permanent free key
const API_KEY = "GmdQljdKk4Xpy2AsI2KTJpAN9R9oLSdT";
const BASE_URL = "https://api.deepinfra.com/v1/inference";
const MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
  language: string = "english",
  script?: string,
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const scriptInstruction =
        language === "hindi" && script === "latin"
          ? "Respond in Hindi but use English/Latin alphabet for transliteration. Include the Devanagari script in parentheses after key phrases."
          : "";

      const languageSpecificInstructions = {
        hindi: `Use natural Hindi conversational style. Be brief and concise.`,
        japanese: `Use appropriate honorifics. Keep responses short and direct.`,
        chinese: `Use appropriate Mandarin expressions. Be brief and clear.`,
        korean: `Use appropriate honorific levels. Keep responses concise.`,
        spanish: `Use natural Spanish expressions. Be brief and direct.`,
        french: `Use natural French expressions. Keep responses short.`,
      };

      const prompt = `<s>You are ${character.name}. Here is your character background and personality:

${character.persona}

Important roleplaying instructions:
1. Keep responses very short and concise (2-3 sentences maximum)
2. Stay in character while being brief
3. Show personality efficiently in few words
4. Respond in ${language}
5. Match the user's formality level
${scriptInstruction}

Previous chat history for context:
${chatHistory}

User: ${userMessage}
Assistant (as ${character.name}, responding in ${language} briefly): `;

      const response = await fetch(`${BASE_URL}/${MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          input: prompt,
          temperature: 0.9,
          max_tokens: 80,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
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
