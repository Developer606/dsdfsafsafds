import { scrypt, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Generate a secure key for a user based on their password
 * @param userId User's ID
 * @param password User's password or other secret
 * @returns A derived encryption key
 */
export async function generateUserEncryptionKey(userId: number, password: string): Promise<string> {
  // Derive key from user's password (or create a separate key)
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 32) as Buffer;
  
  // Store the salt with the key
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Generate a unique conversation key for two users
 * @param user1Id First user's ID
 * @param user2Id Second user's ID
 * @returns A unique conversation key
 */
export async function generateConversationKey(user1Id: number, user2Id: number): Promise<string> {
  // Sort user IDs to ensure the same key regardless of who initiates
  const [smallerId, largerId] = [user1Id, user2Id].sort((a, b) => a - b);
  
  // Create a unique conversation identifier
  const conversationId = `conv_${smallerId}_${largerId}`;
  const key = randomBytes(32).toString('hex');
  
  return key;
}

/**
 * Encrypt message content
 * @param content The content to encrypt
 * @param key The encryption key
 * @returns The encrypted content
 */
export async function encryptMessage(content: string, key: string): Promise<string> {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted content
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt message content
 * @param encryptedContent The encrypted content
 * @param key The decryption key
 * @returns The decrypted content
 */
export async function decryptMessage(encryptedContent: string, key: string): Promise<string> {
  try {
    const [ivHex, encrypted] = encryptedContent.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original content if decryption fails (for backward compatibility)
    return encryptedContent;
  }
}

/**
 * Detect if a message is encrypted
 * @param content The message content
 * @returns True if the message appears to be encrypted
 */
export function isEncryptedMessage(content: string): boolean {
  // Check if the content has the format of an encrypted message (IV:encrypted)
  const parts = content.split(':');
  if (parts.length !== 2) return false;
  
  // Check if first part is a valid hex (IV) - should be 32 chars (16 bytes hex)
  const ivHex = parts[0];
  if (ivHex.length !== 32) return false;
  
  // Check if it's a valid hex string
  return /^[0-9a-f]+$/i.test(ivHex);
}

/**
 * Create a wrapped message object with encryption metadata
 * @param content The original message content (text, JSON, etc.)
 * @param isEncrypted Whether the message is encrypted
 * @returns A message object with encryption metadata
 */
export function createMessageWrapper(content: string, isEncrypted: boolean): string {
  // For non-encrypted messages, just return the content
  if (!isEncrypted) return content;
  
  // For encrypted messages, add a marker to help identify them
  return `e2ee:${content}`;
}

/**
 * Unwrap a message and detect if it's encrypted
 * @param wrappedContent The wrapped message content
 * @returns The unwrapped content and encrypted status
 */
export function unwrapMessage(wrappedContent: string): { content: string, isEncrypted: boolean } {
  // Check if it's an encrypted message with our marker
  if (wrappedContent.startsWith('e2ee:')) {
    return { 
      content: wrappedContent.substring(5), 
      isEncrypted: true 
    };
  }
  
  // Regular message
  return {
    content: wrappedContent,
    isEncrypted: false
  };
}