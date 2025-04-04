import { adminDb } from './server/admin-db.js';
import { apiKeys } from './shared/admin-schema.js';
import { eq } from 'drizzle-orm';

// Function to store Google OAuth credentials in the admin database
async function storeGoogleOAuthCredentials(clientId, clientSecret) {
  try {
    // Check if credentials already exist
    const existingKey = await adminDb.query.apiKeys.findFirst({
      where: eq(apiKeys.service, 'google')
    });
    
    const credentials = JSON.stringify({
      clientId,
      clientSecret
    });
    
    if (existingKey) {
      // Update existing credentials
      await adminDb.update(apiKeys)
        .set({ 
          key: credentials,
          updatedAt: new Date()
        })
        .where(eq(apiKeys.service, 'google'));
      
      console.log('Google OAuth credentials updated successfully');
    } else {
      // Insert new credentials
      await adminDb.insert(apiKeys).values({
        service: 'google',
        key: credentials,
        description: 'Google OAuth credentials for social login',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Google OAuth credentials stored successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error storing Google OAuth credentials:', error);
    return false;
  }
}

// Get Google credentials from environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

async function migrateGoogleCredentials() {
  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not found in environment variables.');
    process.exit(1);
  }
  
  try {
    await adminDb.execute('SELECT 1');
    const result = await storeGoogleOAuthCredentials(clientId, clientSecret);
    
    if (result) {
      console.log('Google OAuth credentials migrated successfully to the database.');
      process.exit(0);
    } else {
      console.error('Failed to migrate Google OAuth credentials.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during Google credentials migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateGoogleCredentials();