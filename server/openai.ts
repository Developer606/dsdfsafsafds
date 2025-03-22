import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { type Character } from "@shared/characters";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./admin-db";

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
  console.log("api-keys.json file not found or invalid, using admin database instead");
}

// First try to get token from admin database, then fallback to environment variable
let token: string | null = null;

// Using an IIFE to allow async operation at module level
(async () => {
  token = await getApiKey("GITHUB_TOKEN");
  
  // Fallback to environment variable if not in database
  if (!token) {
    token = process.env["GITHUB_TOKEN"] || null;
  }
  
  if (!token) {
    console.error("Missing GITHUB_TOKEN. API responses will use fallback messages.");
  }
})();

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
  language: string = "english",
  script?: string,
): Promise<string> {
  try {
    // If no token available, return fallback message
    if (!token) {
      console.warn("No API token available for LLM service");
      return "I'm having trouble connecting to my brain right now. Could we chat a bit later?";
    }
    
    const client = ModelClient(
      "https://models.inference.ai.azure.com",
      new AzureKeyCredential(token),
    );

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

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [{ role: "user", content: prompt }],
        model: "Llama-3.2-90B-Vision-Instruct",
        temperature: 0.8,
        max_tokens: 2048,
        top_p: 0.1,
      },
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    // Safely extract text content with fallback
    let generatedText = response.body.choices?.[0]?.message?.content?.trim() || "";

    if (generatedText) {
      generatedText = generatedText.replace(
        /^(Assistant|Character|[^:]+):\s*/i,
        "",
      );
      generatedText = generatedText.replace(/^['"]|['"]$/g, "");
    }

    return generatedText || "I'm having trouble responding right now.";
  } catch (error: any) {
    console.error("LLM API error:", error);
    return "Hey, I'm feeling really exhausted, so I'm going to rest now. Talk to you soon!";
  }
}

// Entry point
export async function main() {
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

main().catch((err) => console.error("Error:", err));
