import { type Character } from "@shared/characters";

const API_KEY =
  process.env.DEEPINFRA_API_KEY || "InfTpj2vnsnNqBdQ8ApKleWQC6B9xtto";
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

      // Enhanced language-specific instructions
      const languageInstructions: Record<string, string> = {
        english: "Respond naturally in English.",
        hindi: "हिंदी में स्वाभाविक रूप से जवाब दें। Keep responses concise.",
        japanese:
          "自然な日本語で応答してください。敬語を適切に使用してください。",
        chinese: "用自然的中文回应。注意使用适当的敬语。",
        korean:
          "자연스러운 한국어로 대답해주세요. 존댓말을 적절히 사용해주세요.",
        spanish:
          "Responde naturalmente en español. Usa el nivel de formalidad apropiado.",
        french:
          "Répondez naturellement en français. Utilisez le niveau de formalité approprié.",
      };

      const languageInstruction =
        languageInstructions[language as keyof typeof languageInstructions] ||
        languageInstructions.english;

      const prompt = `<s> [INST] You are ${character.name}, with this background:

${character.persona}

Instructions:
1. ${languageInstruction}
2. ${scriptInstruction}
3. Stay in character
4. Be concise (2-3 sentences)
5. Match conversation tone

Chat history:
${chatHistory}

User: ${userMessage}
[/INST]

Assistant (${character.name}): `;

      const response = await fetch(`${BASE_URL}/${MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          input: prompt,
          temperature: 0.8,
          max_tokens: 150,
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
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      let generatedText = data.results?.[0]?.generated_text?.trim();

      // Clean up the response
      if (generatedText) {
        // Remove any "Assistant:" or similar prefixes
        generatedText = generatedText.replace(
          /^(Assistant|Character|[^:]+):\s*/i,
          "",
        );
        // Trim any quotes that might wrap the entire response
        generatedText = generatedText.replace(/^["']|["']$/g, "");
      }

      return generatedText || "I'm having trouble responding right now.";
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
