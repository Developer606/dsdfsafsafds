// Utility script to manage credentials in the admin database
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Ensure the database directory exists
const dbDir = path.join(__dirname, "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to admin database
const adminDb = new Database(path.join(dbDir, "admin.db"));

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to view all credentials
function viewAllCredentials() {
  try {
    const credentials = adminDb.prepare('SELECT service, key, description FROM api_keys ORDER BY service').all();
    
    console.log("\n=== Current Credentials ===");
    console.log("Service".padEnd(35) + "Description".padEnd(40) + "Key");
    console.log("=".repeat(120));
    
    credentials.forEach(cred => {
      const maskedKey = maskCredential(cred.key);
      console.log(cred.service.padEnd(35) + (cred.description || '').padEnd(40) + maskedKey);
    });
    
    console.log("\n");
    showMainMenu();
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    showMainMenu();
  }
}

// Function to add or update a credential
function addOrUpdateCredential() {
  rl.question("\nEnter service name (e.g., SMTP_USER, PAYPAL_SANDBOX_CLIENT_ID): ", (service) => {
    if (!service) {
      console.log("Service name is required.");
      return showMainMenu();
    }
    
    // Check if credential already exists
    const existing = adminDb.prepare('SELECT * FROM api_keys WHERE service = ?').get(service);
    
    rl.question(`Enter ${existing ? 'new ' : ''}value for ${service}: `, (key) => {
      if (!key) {
        console.log("Value is required.");
        return showMainMenu();
      }
      
      rl.question("Enter description (optional): ", (description) => {
        try {
          if (existing) {
            // Update existing credential
            adminDb.prepare('UPDATE api_keys SET key = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE service = ?')
              .run(key, description || existing.description, service);
            console.log(`\n✅ Credential ${service} updated successfully.`);
          } else {
            // Insert new credential
            adminDb.prepare('INSERT INTO api_keys (service, key, description) VALUES (?, ?, ?)')
              .run(service, key, description);
            console.log(`\n✅ Credential ${service} added successfully.`);
          }
        } catch (error) {
          console.error("Error saving credential:", error);
        }
        
        showMainMenu();
      });
    });
  });
}

// Function to delete a credential
function deleteCredential() {
  rl.question("\nEnter service name to delete: ", (service) => {
    if (!service) {
      console.log("Service name is required.");
      return showMainMenu();
    }
    
    // Check if credential exists
    const existing = adminDb.prepare('SELECT * FROM api_keys WHERE service = ?').get(service);
    
    if (!existing) {
      console.log(`\n❌ Credential ${service} not found.`);
      return showMainMenu();
    }
    
    rl.question(`Are you sure you want to delete ${service}? (y/n): `, (answer) => {
      if (answer.toLowerCase() === 'y') {
        try {
          adminDb.prepare('DELETE FROM api_keys WHERE service = ?').run(service);
          console.log(`\n✅ Credential ${service} deleted successfully.`);
        } catch (error) {
          console.error("Error deleting credential:", error);
        }
      } else {
        console.log("Deletion cancelled.");
      }
      
      showMainMenu();
    });
  });
}

// Function to mask sensitive credential values
function maskCredential(value) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
}

// Show main menu
function showMainMenu() {
  console.log("\n=== Credential Manager ===");
  console.log("1. View all credentials");
  console.log("2. Add or update credential");
  console.log("3. Delete credential");
  console.log("4. Exit");
  
  rl.question("\nSelect an option (1-4): ", (option) => {
    switch (option) {
      case '1':
        viewAllCredentials();
        break;
      case '2':
        addOrUpdateCredential();
        break;
      case '3':
        deleteCredential();
        break;
      case '4':
        console.log("\nExiting Credential Manager.");
        rl.close();
        process.exit(0);
        break;
      default:
        console.log("Invalid option. Please try again.");
        showMainMenu();
    }
  });
}

// Start the application
console.log("Welcome to the Credential Manager");
showMainMenu();