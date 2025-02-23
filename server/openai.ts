import { type Character } from "@shared/characters";

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY || "GmdQljdKk4Xpy2AsI2KTJpAN9R9oLSdT";
const BASE_URL = "https://api.deepinfra.com/v1/inference";

// Models configuration
const MODELS = {
  DEFAULT: "mistralai/Mixtral-8x7B-Instruct-v0.1",
  RESEARCH: "deepseek-ai/deepseek-llm-67b-chat"
} as const;

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
  model: keyof typeof MODELS = "DEFAULT"
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

      const systemPrompt = model === "RESEARCH" ? 
        `<|system|>You are ${character.name}, with this persona: ${character.persona}. 
         You must stay in character and respond in ${language}. Keep responses brief (2-3 sentences).
         ${scriptInstruction}</|system|>` :
        `You are ${character.name}, a character with this background:

         ${character.persona}

         Roleplaying rules:
         1. Respond in ${language}
         2. Stay in character, be brief (2-3 sentences max)
         3. Show personality efficiently
         4. Match user's formality
         ${scriptInstruction}`;

      const prompt = model === "RESEARCH" ? 
        `<|user|>${chatHistory}\nUser: ${userMessage}</|user|>
         <|assistant|>` :
        `${systemPrompt}

         Chat history:
         ${chatHistory}

         User: ${userMessage}
         Assistant (${character.name} in ${language}): `;

      const response = await fetch(`${BASE_URL}/${MODELS[model]}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPINFRA_API_KEY}`,
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

      if (!generatedText) {
        throw new Error("Empty response from API");
      }

      // Clean up the response based on the model
      const cleanedResponse = model === "RESEARCH" 
        ? generatedText.split("<|assistant|>").pop()?.split("<|user|>")[0]?.trim() 
        : generatedText;

      return cleanedResponse || "I'm having trouble responding right now.";
    } catch (error: any) {
      console.error("LLM API error:", error);
      if (++retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      return exhaustionMessages[
        Math.floor(Math.random() * exhaustionMessages.length)
      ];
    }
  }

  return exhaustionMessages[
    Math.floor(Math.random() * exhaustionMessages.length)
  ];
}