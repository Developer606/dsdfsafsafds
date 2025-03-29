import CryptoJS from 'crypto-js';

// Generate a secure encryption key based on user IDs
// This approach creates a deterministic key for each conversation
export function generateConversationKey(userId1: number, userId2: number): string {
  // Ensure the key is always the same regardless of the order of user IDs
  const sortedIds = [userId1, userId2].sort();
  
  // Create a base key from sorted user IDs plus a salt
  // In a production environment, this salt should be stored securely and not in the code
  const baseSalt = "AnimeCharacterChatApp_SecureConversation";
  const baseKey = `${sortedIds[0]}_${sortedIds[1]}_${baseSalt}`;
  
  // Generate a SHA-256 hash to use as our encryption key
  return CryptoJS.SHA256(baseKey).toString();
}

// Encrypt message content
export function encryptMessage(content: string, userId1: number, userId2: number): string {
  const key = generateConversationKey(userId1, userId2);
  return CryptoJS.AES.encrypt(content, key).toString();
}

// Decrypt message content
export function decryptMessage(encryptedContent: string, userId1: number, userId2: number): string {
  const key = generateConversationKey(userId1, userId2);
  const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Function to check if a string is already encrypted
export function isEncrypted(content: string): boolean {
  // Encrypted content with AES will typically be a long string with a specific format
  // This is a simple heuristic that might need to be improved for production
  return /^U2FsdGVk/.test(content) && content.length > 40 && !content.includes('{');
}

// Helper function to encrypt JSON content
export function encryptJsonContent(jsonContent: any, senderId: number, receiverId: number): string {
  const stringContent = JSON.stringify(jsonContent);
  return encryptMessage(stringContent, senderId, receiverId);
}

// Helper function to decrypt and parse JSON content
export function decryptJsonContent(encryptedContent: string, userId1: number, userId2: number): any {
  try {
    const decrypted = decryptMessage(encryptedContent, userId1, userId2);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt or parse content:", error);
    return { text: "Error: This message could not be decrypted" };
  }
}