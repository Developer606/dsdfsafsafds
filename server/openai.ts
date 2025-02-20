import { type Character } from "@shared/characters";

if (!process.env.DEEPINFRA_API_KEY) {
  throw new Error("Missing DEEPINFRA_API_KEY environment variable");
}

const API_KEY = process.env.DEEPINFRA_API_KEY;
const BASE_URL = "https://api.deepinfra.com/v1/inference";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct";

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
): Promise<string> {
  try {
    const prompt = `<s>You are ${character.name}. ${character.persona}
Previous chat history for context:
${chatHistory}

User: ${userMessage}
Assistant: `;

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
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results[0].generated_text || "Sorry, I couldn't respond.";
  } catch (error) {
    console.error("LLM API error:", error);
    throw new Error("Failed to generate response");
  }
}
