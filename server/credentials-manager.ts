import crypto from 'crypto';
import { z } from 'zod';

// Schema for PayPal credentials
const paypalCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  secret: z.string().min(1, "Secret is required"),
});

export type PayPalCredentials = z.infer<typeof paypalCredentialsSchema>;

class CredentialsManager {
  private static instance: CredentialsManager;
  private encryptionKey: Buffer;

  private constructor() {
    // Use a secure encryption key from environment
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  public static getInstance(): CredentialsManager {
    if (!CredentialsManager.instance) {
      CredentialsManager.instance = new CredentialsManager();
    }
    return CredentialsManager.instance;
  }

  // Get PayPal credentials from environment variables
  public getPayPalCredentials(): PayPalCredentials | null {
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const secret = process.env.PAYPAL_SECRET;

      if (!clientId || !secret) {
        console.error('PayPal credentials not found in environment variables');
        return null;
      }

      return paypalCredentialsSchema.parse({
        clientId,
        secret
      });
    } catch (error) {
      console.error('Error getting PayPal credentials:', error);
      return null;
    }
  }

  // Validate PayPal credentials format
  public validatePayPalCredentials(credentials: PayPalCredentials): boolean {
    try {
      paypalCredentialsSchema.parse(credentials);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const credentialsManager = CredentialsManager.getInstance();