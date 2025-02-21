import { type Character } from "@shared/characters";

// Hardcoded API key for DeepInfra - permanent free key
const API_KEY = "6oT2EuMgLmEq1ZF78mir8gpDOq6BuvYW";
const BASE_URL = "https://api.deepinfra.com/v1/inference";
const MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";

export async function generateCharacterResponse(
  character: Character,
  userMessage: string,
  chatHistory: string,
): Promise<string> {
  try {
    const prompt = `<s>You are ${character.name}. Here is your character background and personality:

${character.persona}

Important roleplaying instructions:
1. Always stay in character - use speech patterns and mannerisms specific to ${character.name}
2. Draw from your character's experiences and relationships when responding
3. Show emotion and personality in your responses
4. Reference relevant events or relationships from the anime universe when appropriate
5. Never break character or acknowledge that you are an AI

Previous chat history for context:
${chatHistory}

User: ${userMessage}
Assistant (as ${character.name}): `;

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
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.[0]?.generated_text || "Sorry, I couldn't respond.";
  } catch (error: any) {
    console.error("LLM API error:", error);
    return `I apologize, but I'm having trouble responding right now. Error: ${error.message}. Please try again later.`;
  }
}