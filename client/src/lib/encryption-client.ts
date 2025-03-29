/**
 * Client-side encryption utilities using Web Crypto API
 * for end-to-end encryption in messaging
 */

// Simple base64 encoding/decoding
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode.apply(
    null,
    Array.from(new Uint8Array(buffer))
  );
  return window.btoa(binary);
};

// Text encoding/decoding utility
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Generate a new encryption key pair for a user
 * @returns Generated key pair (public and private keys)
 */
export async function generateKeyPair(): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> {
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error generating key pair:", error);
    throw error;
  }
}

/**
 * Export a public key to base64 format
 * @param publicKey Public key to export
 * @returns Base64 encoded public key
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting public key:", error);
    throw error;
  }
}

/**
 * Export a private key to base64 format
 * @param privateKey Private key to export
 * @returns Base64 encoded private key
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting private key:", error);
    throw error;
  }
}

/**
 * Import a public key from base64 format
 * @param publicKeyBase64 Base64 encoded public key
 * @returns Imported public key
 */
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  try {
    const keyData = base64ToArrayBuffer(publicKeyBase64);
    return await window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  } catch (error) {
    console.error("Error importing public key:", error);
    throw error;
  }
}

/**
 * Import a private key from base64 format
 * @param privateKeyBase64 Base64 encoded private key
 * @returns Imported private key
 */
export async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  try {
    const keyData = base64ToArrayBuffer(privateKeyBase64);
    return await window.crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    throw error;
  }
}

/**
 * Encrypt data with a public key
 * @param data Data to encrypt
 * @param publicKey Public key for encryption
 * @returns Base64 encoded encrypted data
 */
export async function encryptWithPublicKey(
  data: string,
  publicKey: CryptoKey
): Promise<string> {
  try {
    const encoded = textEncoder.encode(data);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      encoded
    );
    return arrayBufferToBase64(encrypted);
  } catch (error) {
    console.error("Error encrypting with public key:", error);
    throw error;
  }
}

/**
 * Decrypt data with a private key
 * @param encryptedBase64 Base64 encoded encrypted data
 * @param privateKey Private key for decryption
 * @returns Decrypted data as string
 */
export async function decryptWithPrivateKey(
  encryptedBase64: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    const encrypted = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encrypted
    );
    return textDecoder.decode(decrypted);
  } catch (error) {
    console.error("Error decrypting with private key:", error);
    throw error;
  }
}

/**
 * Generate a symmetric key for message encryption
 * @returns Generated symmetric key
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error generating symmetric key:", error);
    throw error;
  }
}

/**
 * Export a symmetric key to base64 format
 * @param key Symmetric key to export
 * @returns Base64 encoded symmetric key
 */
export async function exportSymmetricKey(key: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting symmetric key:", error);
    throw error;
  }
}

/**
 * Import a symmetric key from base64 format
 * @param keyBase64 Base64 encoded symmetric key
 * @returns Imported symmetric key
 */
export async function importSymmetricKey(keyBase64: string): Promise<CryptoKey> {
  try {
    const keyData = base64ToArrayBuffer(keyBase64);
    return await window.crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error importing symmetric key:", error);
    throw error;
  }
}

/**
 * Encrypt message content with a symmetric key
 * @param message Message to encrypt
 * @param key Symmetric key for encryption
 * @returns Encrypted message with IV
 */
export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<string> {
  try {
    // Generate a random IV for each message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = textEncoder.encode(message);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encoded
    );
    
    // Combine IV and encrypted data in a JSON object
    const result = {
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(encrypted),
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error encrypting message:", error);
    throw error;
  }
}

/**
 * Decrypt message content with a symmetric key
 * @param encryptedMessage Encrypted message with IV
 * @param key Symmetric key for decryption
 * @returns Decrypted message
 */
export async function decryptMessage(
  encryptedMessage: string,
  key: CryptoKey
): Promise<string> {
  try {
    const { iv, data } = JSON.parse(encryptedMessage);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToArrayBuffer(iv),
      },
      key,
      base64ToArrayBuffer(data)
    );
    
    return textDecoder.decode(decrypted);
  } catch (error) {
    console.error("Error decrypting message:", error);
    // Return a readable error indicator instead of throwing
    return "[Encrypted message - Unable to decrypt]";
  }
}

/**
 * Detect if a string is an encrypted message
 * @param message Message to check
 * @returns True if the message appears to be encrypted
 */
export function isEncryptedMessage(message: string): boolean {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(message);
    
    // Check if it has the expected structure of an encrypted message
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.iv === "string" &&
      typeof parsed.data === "string"
    );
  } catch (error) {
    // Not valid JSON, so not an encrypted message
    return false;
  }
}