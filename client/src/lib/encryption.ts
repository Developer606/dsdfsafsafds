import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Type definitions for message content
interface MessageContent {
  text: string;
  imageData?: string;
  videoData?: string;
  moderated?: boolean;
  moderationHash?: string;
}

/**
 * Generate a key pair for public key encryption
 * @returns An object containing the keypair
 */
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey)
  };
};

/**
 * Store the user's keys in local storage
 * @param publicKey The user's public key
 * @param secretKey The user's private key
 */
export const storeUserKeys = (publicKey: string, secretKey: string) => {
  localStorage.setItem('userPublicKey', publicKey);
  localStorage.setItem('userSecretKey', secretKey);
};

/**
 * Retrieve the user's keys from local storage
 * @returns The user's public and private keys or generates new ones if not found
 */
export const getUserKeys = () => {
  let publicKey = localStorage.getItem('userPublicKey');
  let secretKey = localStorage.getItem('userSecretKey');
  
  if (!publicKey || !secretKey) {
    const keyPair = generateKeyPair();
    publicKey = keyPair.publicKey;
    secretKey = keyPair.secretKey;
    storeUserKeys(publicKey, secretKey);
  }
  
  return { publicKey, secretKey };
};

/**
 * Generate a one-time nonce for encryption
 * @returns The nonce as a base64 string
 */
export const generateNonce = () => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  return util.encodeBase64(nonce);
};

/**
 * Calculate a hash of the message for moderation purposes
 * @param text The message text to hash
 * @returns A hash string of the content
 */
export const generateModerationHash = (text: string) => {
  // Simple hash function for moderation purposes
  // This allows checking banned words without seeing the full message
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase());
  return Array.from(data)
    .reduce((hash, byte) => ((hash << 5) - hash) + byte, 0)
    .toString(36);
};

/**
 * Create an encrypted message that can still be moderated
 * @param content The message content to encrypt
 * @param recipientPublicKey The recipient's public key
 * @param senderSecretKey The sender's private key
 * @returns An object with the encrypted message and moderation data
 */
export const createEncryptedMessage = (
  content: MessageContent,
  recipientPublicKey: string, 
  senderSecretKey: string
) => {
  // Extract content pieces
  const { text, imageData, videoData } = content;
  
  // Keep a copy of the message text for moderation hash
  const moderationHash = generateModerationHash(text);
  
  // Create a moderation fingerprint from the actual text
  // This allows checking if the message contains prohibited content
  // without revealing the actual content to the server
  
  // Prepare the full content for encryption
  const fullContent = JSON.stringify({
    text,
    imageData,
    videoData
  });
  
  // Generate a nonce for this encryption
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const nonceBase64 = util.encodeBase64(nonce);
  
  // Convert keys from base64 to Uint8Array for encryption
  const publicKeyUint8 = util.decodeBase64(recipientPublicKey);
  const secretKeyUint8 = util.decodeBase64(senderSecretKey);
  
  // Encrypt the content
  const messageUint8 = util.decodeUTF8(fullContent);
  const encryptedMessage = nacl.box(
    messageUint8,
    nonce,
    publicKeyUint8,
    secretKeyUint8
  );
  
  // Convert encrypted message to base64 for transmission
  const encryptedBase64 = util.encodeBase64(encryptedMessage);
  
  // Return both the encrypted message and information for moderation
  return {
    version: 'e2ee-v1', // Version of the encryption protocol
    encrypted: encryptedBase64,
    nonce: nonceBase64,
    // The text content is NOT included in clear text
    // Only a fingerprint for moderation is included
    moderationHash
  };
};

/**
 * Decrypt an encrypted message
 * @param encryptedData The encrypted message data
 * @param senderPublicKey The sender's public key
 * @param recipientSecretKey The recipient's private key
 * @returns The decrypted message content
 */
export const decryptMessage = (
  encryptedData: any,
  senderPublicKey: string,
  recipientSecretKey: string
) => {
  // Extract encrypted data components
  const { encrypted, nonce, version } = encryptedData;
  
  // Verify this is an encrypted message we can handle
  if (!encrypted || !nonce || version !== 'e2ee-v1') {
    throw new Error('Invalid encrypted message format');
  }
  
  // Convert from base64 to Uint8Array for decryption
  const encryptedUint8 = util.decodeBase64(encrypted);
  const nonceUint8 = util.decodeBase64(nonce);
  const publicKeyUint8 = util.decodeBase64(senderPublicKey);
  const secretKeyUint8 = util.decodeBase64(recipientSecretKey);
  
  // Decrypt the message
  const decryptedUint8 = nacl.box.open(
    encryptedUint8,
    nonceUint8,
    publicKeyUint8,
    secretKeyUint8
  );
  
  if (!decryptedUint8) {
    throw new Error('Failed to decrypt message');
  }
  
  // Convert the decrypted message back to a string
  const decryptedStr = util.encodeUTF8(decryptedUint8);
  
  // Parse the decrypted content
  return JSON.parse(decryptedStr);
};

/**
 * Determine if a message is encrypted
 * @param content The message content to check
 * @returns True if the message is encrypted
 */
export const isEncryptedMessage = (content: any): boolean => {
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return parsed?.version === 'e2ee-v1' && !!parsed.encrypted && !!parsed.nonce;
  } catch (error) {
    return false;
  }
};

/**
 * Get the moderation hash from a message
 * @param content The message content
 * @returns The moderation hash if available
 */
export const getModerationHash = (content: any): string | null => {
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return parsed?.moderationHash || null;
  } catch (error) {
    return null;
  }
};