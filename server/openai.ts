import { type Character } from "@shared/characters";
import OpenAI from "openai";
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Initialize OpenAI with the environment variable
let openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "YOUR-DEFAULT-API-KEY"
});

// Function to update API key
export async function updateApiKey(newApiKey: string): Promise<void> {
  try {
    // Update the OpenAI instance
    openai = new OpenAI({ apiKey: newApiKey });

    // Update environment variable
    process.env.OPENAI_API_KEY = newApiKey;

    // Update .env file
    const envFilePath = join(process.cwd(), '.env');
    const envContent = `OPENAI_API_KEY=${newApiKey}\n`;
    await writeFile(envFilePath, envContent, 'utf-8');
  } catch (error) {
    console.error('Failed to update API key:', error);
    throw error;
  }
}

// Export the OpenAI instance
export const openaiClient = openai;

// Exhaustion messages for a more immersive failure response
const exhaustionMessages = [
  "Hey, I'm feeling really exhausted, so I'm going to rest now. Talk to you soon!",
  "I'm super tired and need some rest. I'll catch up with you later. Take care!",
  "Feeling drained, so I'm heading to rest. See you soon!",
  "Hey, I'm really worn out and need to sleep. Let's chat later!",
  "Totally exhausted right now, so I'm off to rest. Talk soon!",
];

export async function generateCharacterResponse(
  character: any,
  userMessage: string,
  chatHistory: string,
  language: string = "english",
  script?: string,
): Promise<string> {
  try {
    const scriptInstruction =
      language === "hindi" && script === "latin"
        ? "Respond in Hindi but use Latin alphabet (include Devanagari in parentheses)."
        : "";

    const languageInstructions: Record<string, string> = {
      english: "Respond naturally in English.",
      hindi: "हिंदी में स्वाभाविक रूप से जवाब दें। Keep responses concise.",
      japanese: "自然な日本語で応答してください。敬語を適切に使用してください。",
      chinese: "用自然的中文回应。注意使用适当的敬语。",
      korean: "자연스러운 한국어로 대답해주세요. 존댓말을 적절히 사용해주세요.",
      spanish: "Responde naturalmente en español. Usa el nivel de formalidad apropiado.",
      french: "Répondez naturellement en français. Utilisez le niveau de formalité approprié.",
    };

    const languageInstruction =
      languageInstructions[language as keyof typeof languageInstructions] ||
      languageInstructions.english;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${character.name}, with this background:\n\n${character.persona}\n\nInstructions:\n1. ${languageInstruction}\n2. ${scriptInstruction}\n3. Stay in character\n4. Be concise (2-3 sentences)\n5. Match conversation tone`
        },
        {
          role: "user",
          content: `Chat history:\n${chatHistory}\n\nUser: ${userMessage}`
        }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    let generatedText = response.choices[0].message.content?.trim() || "";

    // Clean up the response
    if (generatedText) {
      // Remove any "Assistant:" or similar prefixes
      generatedText = generatedText.replace(/^(Assistant|Character|[^:]+):\s*/i, "");
      // Trim any quotes that might wrap the entire response
      generatedText = generatedText.replace(/^["']|["']$/g, "");
    }

    return generatedText || "I'm having trouble responding right now.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return exhaustionMessages[Math.floor(Math.random() * exhaustionMessages.length)];
  }
}