import { getApiKey, initializeAdminDb } from './server/admin-db.js';
import { OpenAI } from 'openai';

async function testNebiusWithOpenAIClient() {
  console.log("Initializing admin database...");
  await initializeAdminDb();
  
  console.log("Retrieving Nebius API key from database...");
  const apiKey = await getApiKey("NEBIUS_API_KEY") || process.env.NEBIUS_API_KEY;
  
  if (!apiKey) {
    console.error("Error: Could not retrieve NEBIUS_API_KEY");
    return;
  }
  
  console.log("API key retrieved successfully (first 10 chars):", apiKey.substring(0, 10) + "...");
  
  try {
    console.log("Creating OpenAI client with Nebius base URL...");
    const client = new OpenAI({
      baseURL: 'https://api.studio.nebius.com/v1/',
      apiKey: apiKey,
    });
    
    console.log("Sending request to Nebius Studio...");
    const response = await client.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
      extra_body: {
        top_k: 50
      },
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Introduce yourself in one sentence." }
      ]
    });
    
    console.log("\nResponse from Nebius Studio:");
    console.log("------------------------------------");
    console.log(response.choices[0].message.content.trim());
    console.log("------------------------------------");
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testNebiusWithOpenAIClient();