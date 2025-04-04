import { adminDb } from "../admin-db";
import { apiKeys } from "@shared/admin-schema";
import { eq } from "drizzle-orm";

// Function to get Google OAuth credentials from admin database
export async function getGoogleOAuthCredentials() {
  try {
    // First, try to get from environment variables
    let clientId = process.env.GOOGLE_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // If not in env vars, try to get from admin database
    if (!clientId || !clientSecret) {
      const googleApiKey = await adminDb.query.apiKeys.findFirst({
        where: eq(apiKeys.service, 'google')
      });
      
      if (googleApiKey) {
        try {
          const credentials = JSON.parse(googleApiKey.key);
          clientId = credentials.clientId;
          clientSecret = credentials.clientSecret;
        } catch (e) {
          console.error('Error parsing Google credentials from database:', e);
        }
      }
    }
    
    // Get the Replit domain from environment variables
    const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : '';
    
    // Allow for a hard-coded callback URL from environment for easier testing
    const callbackOverride = process.env.GOOGLE_CALLBACK_URL;
    
    // Production domain handling - for when the app is deployed to a custom domain
    const productionDomain = process.env.PRODUCTION_DOMAIN;
    
    // Determine the appropriate callback URL based on available environment information
    let callbackURL;
    
    if (callbackOverride) {
      // Use explicitly provided callback URL if available (highest priority)
      callbackURL = callbackOverride;
    } else if (productionDomain) {
      // Use production domain if available
      callbackURL = `https://${productionDomain}/api/auth/google/callback`;
    } else if (replitDomain) {
      // Use Replit domain if available
      callbackURL = `https://${replitDomain}/api/auth/google/callback`;
    } else {
      // Fallback to localhost
      callbackURL = 'http://localhost:5000/api/auth/google/callback';
    }
    
    console.log('Using Google OAuth callback URL:', callbackURL);
    
    return {
      clientId,
      clientSecret,
      callbackURL
    };
  } catch (error) {
    console.error('Error getting Google OAuth credentials:', error);
    return {
      clientId: null,
      clientSecret: null,
      callbackURL: null
    };
  }
}