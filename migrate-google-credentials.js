import { storeGoogleOAuthCredentials } from './server/utils/store-oauth-credentials.ts';

// Get Google credentials from environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

async function migrateGoogleCredentials() {
  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not found in environment variables.');
    process.exit(1);
  }
  
  try {
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