import { type Character } from "@shared/characters";

const API_KEY = "GmdQljdKk4Xpy2AsI2KTJpAN9R9oLSdT";
const BASE_URL = "https://api.deepinfra.com/v1/inference";
const MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

// Exhaustion messages for a more immersive failure response
const exhaustionMessages = [
  "Hey, I'm feeling really exhausted, so I'm going to rest now. Talk to you soon!",
  "I'm super tired and need some rest. I'll catch up with you later. Take care!",
  "Feeling drained, so I'm heading to rest. See you soon!",
  "Hey, I'm really worn out and need to sleep. Let's chat later!",
  "Totally exhausted right now, so I'm off to rest. Talk soon!",
];

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
          ? "Respond in Hindi but use Latin alphabet (include Devanagari in parentheses)."
          : "";

      const languageInstructions: Record<string, string> = {
        hindi: "Respond naturally in Hindi, keep it short.",
        japanese: "Use honorifics, be concise.",
        chinese: "Use Mandarin expressions, be brief.",
        korean: "Respect honorifics, concise response.",
        spanish: "Use natural Spanish, keep it short.",
        french: "Use natural French, brief reply.",
      };

      const prompt = `<s> You are ${character.name}, a character with this background:

${character.persona}

Roleplaying rules:
1. Respond in ${language}
2. Stay in character, be brief (2-3 sentences max)
3. Show personality efficiently
4. Match user's formality
${scriptInstruction}

Chat history:
${chatHistory}

User: ${userMessage}
Assistant (${character.name} in ${language}): `;

      const response = await fetch(`${BASE_URL}/${MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          input: prompt,
          temperature: 0.8,
          max_tokens: 60,
          top_p: 0.8,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          retries++;
          continue;
        }
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const generatedText = data.results?.[0]?.generated_text?.trim();

      return generatedText || "I'm having trouble responding right now.";
    } catch (error: any) {
      if (++retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
      console.error("LLM API error:", error);

      // Return a random exhaustion message on failure
      return exhaustionMessages[
        Math.floor(Math.random() * exhaustionMessages.length)
      ];
    }
  }

  return exhaustionMessages[
    Math.floor(Math.random() * exhaustionMessages.length)
  ];
}
