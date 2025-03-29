import { z } from "zod";

/**
 * The prefix used to identify encrypted content in messages
 */
export const ENCRYPTION_PREFIX = "ENC::";

/**
 * Check if a message is encrypted
 * @param message The message content to check
 * @returns True if the message is encrypted, false otherwise
 */
export function isMessageEncrypted(message: string): boolean {
  return message.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Extract the encrypted content from a message
 * @param message The message with encryption prefix
 * @returns The encrypted content without the prefix
 */
export function extractEncryptedContent(message: string): string {
  if (!isMessageEncrypted(message)) {
    return message;
  }
  return message.slice(ENCRYPTION_PREFIX.length);
}

/**
 * Interface for API response when checking encryption status for a conversation
 */
export interface EncryptionStatusResponse {
  isEncrypted: boolean;
  canEnable: boolean;
}

/**
 * Interface for API request when initiating encryption for a conversation
 */
export interface InitiateEncryptionRequest {
  userId: number;
  publicKey: string;
  encryptedSymmetricKey: string;
}

/**
 * Schema for validating encryption initiation request
 */
export const initiateEncryptionSchema = z.object({
  userId: z.number(),
  publicKey: z.string(),
  encryptedSymmetricKey: z.string(),
});

/**
 * Interface for storing encryption keys
 */
export interface StoreEncryptionKeyRequest {
  publicKey: string;
}

/**
 * Schema for validating store encryption key request
 */
export const storeEncryptionKeySchema = z.object({
  publicKey: z.string(),
});

/**
 * Interface for API response when getting public key
 */
export interface PublicKeyResponse {
  publicKey: string;
}

/**
 * Interface for API response when getting encrypted conversation key
 */
export interface EncryptedKeyResponse {
  encryptedKey: string;
}

/**
 * Interface for success response
 */
export interface SuccessResponse {
  success: boolean;
}