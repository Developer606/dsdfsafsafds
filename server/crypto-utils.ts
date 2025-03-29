/**
 * Crypto utility functions for encrypting and decrypting messages
 */
import * as crypto from 'crypto';
import { config } from './config';

// We'll use this key for encryption/decryption
// In a production environment, this should be stored securely, not hardcoded
const ENCRYPTION_KEY = config.messageEncryptionKey || 'default-encryption-key-change-me-in-prod-32';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a message using AES-256-CBC
 * 
 * @param text The text to encrypt
 * @returns Encrypted text as base64 string with IV prepended
 */
export function encryptMessage(text: string): string {
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Prepend the IV to the encrypted data (we'll need it for decryption)
  // Convert IV to base64 for storage and prepend to the encrypted message
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * Decrypts a message that was encrypted with encryptMessage
 * 
 * @param encryptedText The encrypted text with IV prepended
 * @returns The decrypted text
 */
export function decryptMessage(encryptedText: string): string {
  try {
    // Split the text to get the IV and encrypted data
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting message:', error);
    // If decryption fails, return the original text
    // This is important for backward compatibility with older non-encrypted messages
    return encryptedText;
  }
}

/**
 * Checks if a message is encrypted using our format
 * 
 * @param text The text to check
 * @returns True if the text appears to be encrypted
 */
export function isEncryptedMessage(text: string): boolean {
  // Simple check based on our format - IV:encrypted
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  
  try {
    // Try to decode the IV part as base64
    Buffer.from(parts[0], 'base64');
    return true;
  } catch {
    return false;
  }
}