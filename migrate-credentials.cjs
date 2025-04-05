// Import the required modules
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure the database directory exists
const dbDir = path.join(__dirname, "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to admin database
const adminDb = new Database(path.join(dbDir, "admin.db"));

// Function to set API key (insert or update)
async function setApiKey(service, key, description) {
  try {
    // Check if the key exists
    const existingKey = adminDb.prepare('SELECT * FROM api_keys WHERE service = ?').get(service);
    
    if (existingKey) {
      // Update existing key
      adminDb.prepare('UPDATE api_keys SET key = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE service = ?')
        .run(key, description || existingKey.description, service);
    } else {
      // Insert new key
      adminDb.prepare('INSERT INTO api_keys (service, key, description) VALUES (?, ?, ?)')
        .run(service, key, description);
    }
    
    return true;
  } catch (error) {
    console.error(`Error setting ${service} API key:`, error);
    return false;
  }
}

// Get credentials from hardcoded sources or environment variables
const paypalSandboxClientId = process.env.PAYPAL_CLIENT_ID || "AYlJp6Gs5nzl0iywAa-6pKijZ8vujbYKhJgDZdTXZ2a2tWyEBAxj463gxxn0NyIv9_Epa0vZ6xEX0DHL";
const paypalSandboxClientSecret = process.env.PAYPAL_SECRET || "EEImgTe9dPCqdFwEjKroHj7-ahYcXPSUigU8U2EQi_AhTr1JdmRDmeOJ7k6Ke6V3mQ4QM2F0XaGIpOIM";
const paypalProductionClientId = process.env.PAYPAL_PROD_CLIENT_ID || "";
const paypalProductionClientSecret = process.env.PAYPAL_PROD_SECRET || "";

const smtpUser = process.env.SMTP_USER || "noreply.animechat@gmail.com";
const smtpPassword = process.env.SMTP_PASSWORD || "ibui zkqn zlcg xucg";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = process.env.SMTP_PORT || "587";

async function migrateCredentials() {
  console.log("Starting migration of credentials to database...");
  
  try {
    // Store PayPal credentials
    const paypalSandboxResult = await setApiKey(
      "PAYPAL_SANDBOX_CLIENT_ID",
      paypalSandboxClientId,
      "PayPal Sandbox Client ID"
    );
    
    const paypalSandboxSecretResult = await setApiKey(
      "PAYPAL_SANDBOX_CLIENT_SECRET",
      paypalSandboxClientSecret,
      "PayPal Sandbox Client Secret"
    );
    
    const paypalProdResult = await setApiKey(
      "PAYPAL_PRODUCTION_CLIENT_ID",
      paypalProductionClientId,
      "PayPal Production Client ID"
    );
    
    const paypalProdSecretResult = await setApiKey(
      "PAYPAL_PRODUCTION_CLIENT_SECRET",
      paypalProductionClientSecret,
      "PayPal Production Client Secret"
    );
    
    // Store Email SMTP credentials
    const smtpUserResult = await setApiKey(
      "SMTP_USER",
      smtpUser,
      "Email SMTP Username"
    );
    
    const smtpPassResult = await setApiKey(
      "SMTP_PASSWORD",
      smtpPassword,
      "Email SMTP Password"
    );
    
    const smtpHostResult = await setApiKey(
      "SMTP_HOST",
      smtpHost,
      "Email SMTP Host"
    );
    
    const smtpPortResult = await setApiKey(
      "SMTP_PORT",
      smtpPort,
      "Email SMTP Port"
    );

    console.log("Credentials migration status:");
    console.log(`- PayPal Sandbox Client ID: ${paypalSandboxResult ? 'Success' : 'Failed'}`);
    console.log(`- PayPal Sandbox Client Secret: ${paypalSandboxSecretResult ? 'Success' : 'Failed'}`);
    console.log(`- PayPal Production Client ID: ${paypalProdResult ? 'Success' : 'Failed'}`);
    console.log(`- PayPal Production Client Secret: ${paypalProdSecretResult ? 'Success' : 'Failed'}`);
    console.log(`- SMTP User: ${smtpUserResult ? 'Success' : 'Failed'}`);
    console.log(`- SMTP Password: ${smtpPassResult ? 'Success' : 'Failed'}`);
    console.log(`- SMTP Host: ${smtpHostResult ? 'Success' : 'Failed'}`);
    console.log(`- SMTP Port: ${smtpPortResult ? 'Success' : 'Failed'}`);
    
    console.log("Credentials migration completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during credentials migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateCredentials();