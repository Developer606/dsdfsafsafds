// Test script to verify user profile data integration with character responses
// Use tsx to run this script: npx tsx test-user-profile-personalization.js
import { generateCharacterResponse } from "./server/openai.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test character for simulation
const testCharacter = {
  id: "test-character",
  name: "Akira",
  avatar: "default-avatar.png",
  description: "A friendly AI assistant who's curious about humans",
  persona: "Akira is curious, friendly, and somewhat naive about human customs. They're always eager to learn more about humans and their lives."
};

// Sample chat history
const chatHistory = "User: Hi there!\nAkira: Hello! It's nice to meet you. What brings you here today?";

// Test function to demonstrate user profile personalization
async function testProfilePersonalization() {
  try {
    console.log("Testing character response personalization with user profile data");
    console.log("-".repeat(70));
    
    // Test case 1: No user profile
    console.log("\nTest Case 1: No user profile data");
    console.log("User message: 'Tell me about yourself.'");
    
    const responseWithoutProfile = await generateCharacterResponse(
      testCharacter,
      "Tell me about yourself.",
      chatHistory,
      "english",
      undefined,
      undefined // No profile data
    );
    
    console.log("\nResponse without profile data:");
    console.log(responseWithoutProfile);
    
    // Test case 2: With profile data
    console.log("\n\nTest Case 2: With user profile data");
    console.log("User message: 'Tell me about yourself.'");
    
    // Sample user profile data
    const userProfile = {
      fullName: "Satoshi Nakamoto",
      age: 28,
      gender: "Male",
      bio: "Cryptography enthusiast and aspiring artist who loves anime and traditional Japanese culture."
    };
    
    const responseWithProfile = await generateCharacterResponse(
      testCharacter,
      "Tell me about yourself.",
      chatHistory,
      "english",
      undefined,
      userProfile
    );
    
    console.log("\nResponse with profile data:");
    console.log(responseWithProfile);
    
    // Test case 3: Get real user profile from database
    console.log("\n\nTest Case 3: With actual user profile from database");
    console.log("User message: 'What can you tell me about me?'");
    
    // Connect to the database to get an actual user
    const dbPath = join(__dirname, 'sqlite.db');
    const db = new Database(dbPath);
    
    // Get the first user from the database that has profile data
    const user = db.prepare(`
      SELECT id, full_name as fullName, age, gender, bio
      FROM users
      WHERE full_name IS NOT NULL
      OR age IS NOT NULL
      OR gender IS NOT NULL
      OR bio IS NOT NULL
      LIMIT 1
    `).get();
    
    console.log(`Found user with ID ${user?.id || 'none'}`);
    
    if (user) {
      console.log(`User profile found: ${user.fullName || 'No name'}, ${user.age || 'No age'}, ${user.gender || 'No gender'}`);
      
      const actualUserProfile = {
        fullName: user.fullName || undefined,
        age: user.age || undefined,
        gender: user.gender || undefined,
        bio: user.bio || undefined
      };
      
      const responseWithActualProfile = await generateCharacterResponse(
        testCharacter,
        "What can you tell me about me?",
        chatHistory,
        "english",
        undefined,
        actualUserProfile
      );
      
      console.log("\nResponse with actual user profile:");
      console.log(responseWithActualProfile);
    } else {
      console.log("No users with profile data found in the database.");
    }
    
    console.log("\n-".repeat(30));
    console.log("Test completed!");
    
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Execute the test function
testProfilePersonalization();