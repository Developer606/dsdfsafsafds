import fetch from 'node-fetch';

// Test users to create
const users = [
  {
    email: "user1@example.com",
    username: "TestUser1",
    password: "password123",
    fullName: "Test User One"
  },
  {
    email: "user2@example.com",
    username: "TestUser2",
    password: "password123",
    fullName: "Test User Two"
  }
];

// Base URL for API
const baseUrl = 'http://localhost:5000';

// Function to register a user
async function registerUser(userData) {
  try {
    const response = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Registration for ${userData.email} failed with status ${response.status}: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`User registered: ${userData.email}`);
    return data;
  } catch (error) {
    console.error(`Registration error for ${userData.email}:`, error.message);
    return null;
  }
}

// Function to login as admin
async function loginAdmin() {
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: "admin@system.local",
        password: "admin123"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Admin login failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Logged in as admin`);
    return data.token;
  } catch (error) {
    console.error('Admin login error:', error.message);
    return null;
  }
}

// Main function
async function createUsers() {
  console.log("Creating test users...");
  
  for (const userData of users) {
    const result = await registerUser(userData);
    if (result) {
      console.log(`User ${userData.email} created successfully`);
    } else {
      console.log(`User ${userData.email} may already exist or registration failed`);
    }
  }
  
  // Attempt admin login as verification
  const adminToken = await loginAdmin();
  if (adminToken) {
    console.log("Admin login successful. Admin account is ready.");
  } else {
    console.log("Admin login failed. Please check admin account credentials.");
  }
  
  console.log("User creation process completed!");
}

// Run the script
createUsers().catch(error => {
  console.error("User creation failed with error:", error);
});