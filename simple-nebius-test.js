import fetch from "node-fetch";

// Get API key from environment variable
const apiKey = process.env.NEBIUS_API_KEY;

async function testNebiusStudio() {
  try {
    console.log("Testing Nebius Studio with Meta-Llama-3.1-8B-Instruct model...");
    
    if (!apiKey) {
      console.error("NEBIUS_API_KEY environment variable is not set");
      process.exit(1);
    }

    // Try the main Nebius generative AI API endpoint
    const NEBIUS_API_URL = "https://generative-ai.api.nebius.cloud/v1/chat/completions";
    
    const systemMessage = "You are a helpful assistant.";
    const userMessage = "Hello! Can you tell me about the Meta-Llama 3.1 model in one short paragraph?";
    
    // Make API call to Nebius Studio
    console.log("Sending request to Nebius Studio...");
    const response = await fetch(NEBIUS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        model: "Meta-Llama-3.1-8B-Instruct",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log("\nModel Response from Nebius Studio:");
    console.log("------------------------------------");
    console.log(data.choices[0].message.content);
    console.log("------------------------------------");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testNebiusStudio();