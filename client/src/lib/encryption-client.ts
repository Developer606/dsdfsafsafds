/**
 * Client-side encryption utility for end-to-end encrypted messaging
 * Uses a combination of RSA for key exchange and AES for message encryption
 */

// Message encryption prefix to identify encrypted messages
export const ENCRYPTION_PREFIX = "ENC::";

// Check if a message is encrypted by looking for the encryption prefix
export function isMessageEncrypted(message: string): boolean {
  return typeof message === 'string' && message.startsWith(ENCRYPTION_PREFIX);
}

// Extract the encrypted content from a message
export function extractEncryptedContent(message: string): string {
  if (!isMessageEncrypted(message)) {
    throw new Error('Message is not encrypted');
  }
  return message.substring(ENCRYPTION_PREFIX.length);
}

// Generate a new RSA key pair for the user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export a public key to a transmissible format
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

// Export a private key to a transmissible format (for local storage only)
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  return arrayBufferToBase64(exported);
}

// Import a public key from a transmissible format
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const binaryKey = base64ToArrayBuffer(publicKeyString);
  return window.crypto.subtle.importKey(
    "spki",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt"]
  );
}

// Import a private key from a transmissible format
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  const binaryKey = base64ToArrayBuffer(privateKeyString);
  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true, // extractable
    ["decrypt"]
  );
}

// Generate a random AES key for symmetric encryption
export async function generateAESKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export an AES key to a transmissible format
export async function exportAESKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Import an AES key from a transmissible format
export async function importAESKey(keyString: string): Promise<CryptoKey> {
  const binaryKey = base64ToArrayBuffer(keyString);
  return window.crypto.subtle.importKey(
    "raw",
    binaryKey,
    {
      name: "AES-GCM",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message with AES-GCM
export async function encryptMessage(message: string, key: CryptoKey): Promise<string> {
  const encodedMessage = new TextEncoder().encode(message);
  
  // Generate a random IV for each encryption
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedMessage
  );
  
  // Combine the IV and encrypted data into a single buffer
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  // Add prefix to identify encrypted messages
  return ENCRYPTION_PREFIX + arrayBufferToBase64(combined);
}

// Decrypt a message with AES-GCM
export async function decryptMessage(encryptedMessage: string, key: CryptoKey): Promise<string> {
  // Remove the encryption prefix
  const encryptedContent = extractEncryptedContent(encryptedMessage);
  
  // Convert from base64 to binary
  const encryptedData = base64ToArrayBuffer(encryptedContent);
  
  // Extract the IV (first 12 bytes)
  const iv = encryptedData.slice(0, 12);
  
  // Extract the encrypted message (everything after the IV)
  const ciphertext = encryptedData.slice(12);
  
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext
    );
    
    // Convert the decrypted buffer back to a string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
}

// Encrypt an AES key with a recipient's public RSA key
export async function encryptAESKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const exportedAESKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    exportedAESKey
  );
  
  return arrayBufferToBase64(encryptedKeyBuffer);
}

// Decrypt an AES key with the user's private RSA key
export async function decryptAESKey(encryptedKeyString: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyString);
  
  const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedKeyBuffer
  );
  
  return window.crypto.subtle.importKey(
    "raw",
    decryptedKeyBuffer,
    {
      name: "AES-GCM",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Utility: Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Alias names for compatibility with existing code
export const generateSymmetricKey = generateAESKey;
export const importSymmetricKey = importAESKey;
export const encryptSymmetricKey = encryptAESKey;
export const decryptSymmetricKey = decryptAESKey;