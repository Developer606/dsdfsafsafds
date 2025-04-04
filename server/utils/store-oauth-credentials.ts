import { adminDb } from "../admin-db";
import { apiKeys } from "@shared/admin-schema";
import { eq } from "drizzle-orm";

// Function to store Google OAuth credentials in the admin database
export async function storeGoogleOAuthCredentials(clientId: string, clientSecret: string) {
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