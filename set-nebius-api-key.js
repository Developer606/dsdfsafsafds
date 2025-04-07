#!/usr/bin/env node

import { setApiKey } from "./server/admin-db.js";
import { initializeAdminDb } from "./server/admin-db.js";

// Get API key from command line arguments
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Please provide a Nebius API key as an argument:');
  console.error('node set-nebius-api-key.js YOUR_API_KEY');
  process.exit(1);
}

async function setNebiusApiKey() {
  try {
    // Initialize the admin database
    await initializeAdminDb();
    
    // Set the API key
    const success = await setApiKey(
      "NEBIUS_API_KEY",
      apiKey,
      "Nebius Studio API key for Meta-Llama-3.1-8B-Instruct model"
    );
    
    if (success) {
      console.log("Successfully set Nebius API key in the database.");
    } else {
      console.error("Failed to set Nebius API key in the database.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

setNebiusApiKey();