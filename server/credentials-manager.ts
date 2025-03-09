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

  // Encrypt sensitive data
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decrypt sensitive data
  private decrypt(text: string): string {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Get PayPal credentials
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
