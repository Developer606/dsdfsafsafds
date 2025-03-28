import fetch from 'node-fetch';
import { createHash } from 'crypto';

// Admin user to create
const adminUser = {
  email: "admin@test.com",
  username: "TestAdmin",
  password: "admin123",
  fullName: "Test Admin",
  isAdmin: true
};

// Base URL for API
const baseUrl = 'http://localhost:5000';

// Function to register a user directly to the backend (since normal registration doesn't allow admin)
async function createAdminUser() {
  try {
    // Login with existing user
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: "user1@example.com",
        password: "password123"
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Failed to login as test user: ${loginResponse.statusText}`);
    }
    
    const { token } = await loginResponse.json();
    console.log("Logged in as test user");
    
    // Hash the password
    const hashedPassword = createHash('sha256').update(adminUser.password).digest('hex');
    
    // Register admin user directly using special endpoint (using API)
    const response = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...adminUser,
        password: hashedPassword
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create admin user: ${response.statusText}`);
    }
    
    console.log(`Admin user created: ${adminUser.email}`);
    
    // Test admin login
    const adminLoginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: adminUser.email,
        password: adminUser.password
      })
    });
    
    if (!adminLoginResponse.ok) {
      throw new Error(`Admin login failed: ${adminLoginResponse.statusText}`);
    }
    
    console.log("Admin login successful");
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

// Run the script
createAdminUser().catch(error => {
  console.error("Script failed with error:", error);
});