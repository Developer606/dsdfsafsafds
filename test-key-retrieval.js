import { getApiKey, initializeAdminDb } from './server/admin-db.js';
import fetch from 'node-fetch';

async function testKeyRetrieval() {
  try {
    console.log("Initializing admin database...");
    await initializeAdminDb();
    
    console.log("Retrieving Nebius API key from database...");
    const apiKey = await getApiKey("NEBIUS_API_KEY");
    
    if (!apiKey) {
      console.error("Error: Could not retrieve NEBIUS_API_KEY from the database");
      return;
    }
    
    console.log("API key retrieved successfully (first 10 chars):", apiKey.substring(0, 10) + "...");
    
    // Now test the API endpoint with different possible URLs
    const possibleEndpoints = [
      "https://llm.api.nebius.cloud/v1/chat/completions",
      "https://generative-ai.api.nebius.cloud/v1/chat/completions",
      "https://generative-ai.api.nebius.cloud/v1/completion",
      "https://generative-ai.api.nebius.cloud/v1/generate",
    ];
    
    const model = "Meta-Llama-3.1-8B-Instruct";
    const systemMessage = "You are a helpful assistant.";
    const userMessage = "Hello! Can you introduce yourself in one sentence?";
    
    for (const endpoint of possibleEndpoints) {
      console.log(`\nTesting endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Api-Key ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 256,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("SUCCESS! API response:");
          console.log(data.choices[0].message.content);
          console.log("\nUsing this endpoint in the application...");
          return; // Stop trying other endpoints
        } else {
          const errorText = await response.text() || `Status: ${response.status}`;
          console.log(`Error: ${errorText}`);
        }
      } catch (error) {
        console.log(`Connection error: ${error.message}`);
      }
    }
    
    console.error("All endpoints failed. Please check documentation for correct endpoint or model name.");
    
  } catch (error) {
    console.error("Test Error:", error);
  }
}

testKeyRetrieval();