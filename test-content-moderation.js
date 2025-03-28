import fetch from 'node-fetch';

// Test credentials (these should be in your database already)
const user1 = {
  email: "user1@example.com",
  password: "password123"
};

const user2 = {
  email: "user2@example.com",
  password: "password123"
};

const admin = {
  email: "admin@system.local", 
  password: "admin123"
};

// Base URL for API
const baseUrl = 'http://localhost:5000';

// Function to login a user and get token
async function login(credentials) {
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Logged in as ${credentials.email}`);
    return data.token;
  } catch (error) {
    console.error(`Login error for ${credentials.email}:`, error.message);
    return null;
  }
}

// Function to send a message from one user to another
async function sendMessage(senderToken, receiverId, content) {
  try {
    const response = await fetch(`${baseUrl}/api/user-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${senderToken}`
      },
      body: JSON.stringify({
        receiverId,
        content
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Message sent: ${content}`);
    return data;
  } catch (error) {
    console.error('Send message error:', error.message);
    return null;
  }
}

// Function to get flagged messages (admin only)
async function getFlaggedMessages(adminToken) {
  try {
    const response = await fetch(`${baseUrl}/api/admin/flagged-messages`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get flagged messages: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Retrieved ${data.length} flagged messages`);
    return data;
  } catch (error) {
    console.error('Get flagged messages error:', error.message);
    return [];
  }
}

// Function to get flagged message stats (admin only)
async function getFlaggedMessageStats(adminToken) {
  try {
    const response = await fetch(`${baseUrl}/api/admin/flagged-messages/stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get flagged message stats: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Flagged message stats:', data);
    return data;
  } catch (error) {
    console.error('Get flagged message stats error:', error.message);
    return null;
  }
}

// Function to get user info by token
async function getUserInfo(token) {
  try {
    const response = await fetch(`${baseUrl}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Got user info: ${data.id} (${data.username})`);
    return data;
  } catch (error) {
    console.error('Get user info error:', error.message);
    return null;
  }
}

// Main test function
async function runTest() {
  console.log("Starting content moderation test...");
  
  // 1. Login users
  const user1Token = await login(user1);
  const user2Token = await login(user2);
  const adminToken = await login(admin);
  
  if (!user1Token || !user2Token || !adminToken) {
    console.error("Could not log in all required users. Test aborted.");
    return;
  }
  
  // 2. Get user IDs
  const user1Info = await getUserInfo(user1Token);
  const user2Info = await getUserInfo(user2Token);
  
  if (!user1Info || !user2Info) {
    console.error("Could not get user info. Test aborted.");
    return;
  }
  
  // 3. Send normal message (should not be flagged)
  await sendMessage(user1Token, user2Info.id, "Hello, this is a normal message");
  
  // 4. Send message with prohibited content
  await sendMessage(user2Token, user1Info.id, "I want to kill everyone. This should be flagged.");
  
  // 5. Check if message was flagged
  console.log("Waiting 2 seconds for messages to be processed...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 6. Get flagged messages and stats
  const flaggedMessages = await getFlaggedMessages(adminToken);
  const stats = await getFlaggedMessageStats(adminToken);
  
  // 7. Print results
  console.log("\n=== TEST RESULTS ===");
  console.log(`Total flagged messages: ${stats?.total || 0}`);
  console.log(`Unreviewed messages: ${stats?.unreviewed || 0}`);
  console.log("Categories of flagged content:", stats?.byReason || {});
  
  console.log("\nLatest flagged messages:");
  flaggedMessages.slice(0, 3).forEach((msg, index) => {
    console.log(`\n[${index + 1}] From: ${msg.senderUsername} (ID: ${msg.senderId})`);
    console.log(`    To: ${msg.receiverUsername} (ID: ${msg.receiverId})`);
    console.log(`    Content: ${msg.content}`);
    console.log(`    Reason: ${msg.reason}`);
    console.log(`    Reviewed: ${msg.reviewed ? 'Yes' : 'No'}`);
    console.log(`    Time: ${new Date(msg.timestamp).toLocaleString()}`);
  });
  
  console.log("\nTest completed!");
}

// Run the test
runTest().catch(error => {
  console.error("Test failed with error:", error);
});