/**
 * Encryption client for end-to-end encryption
 * 
 * This file contains cryptographic functions for:
 * 1. Generating key pairs (RSA)
 * 2. Generating symmetric keys (AES)
 * 3. Encrypting/decrypting messages
 * 4. Converting between formats (Base64, ArrayBuffer)
 */

/**
 * Generate a new RSA key pair for a user
 * @returns Object containing public and private keys as base64 strings
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    // Generate an RSA key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt'] // key usage
    );

    // Export the keys to JWK (JSON Web Key) format
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Convert to strings
    const publicKeyString = JSON.stringify(publicKeyJwk);
    const privateKeyString = JSON.stringify(privateKeyJwk);

    // Encode as base64 for storage
    const publicKeyBase64 = btoa(publicKeyString);
    const privateKeyBase64 = btoa(privateKeyString);

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate encryption keys');
  }
}

/**
 * Generate a new symmetric key for conversation encryption
 * @returns The symmetric key as a base64 string
 */
export async function generateSymmetricKey(): Promise<string> {
  try {
    // Generate an AES-GCM key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt'] // key usage
    );

    // Export the key to raw format
    const keyBuffer = await window.crypto.subtle.exportKey('raw', key);
    
    // Convert to base64 for storage
    return arrayBufferToBase64(keyBuffer);
  } catch (error) {
    console.error('Error generating symmetric key:', error);
    throw new Error('Failed to generate symmetric encryption key');
  }
}

/**
 * Import a public key from string format
 * @param publicKeyString Base64 encoded public key
 * @returns CryptoKey object
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  try {
    // Decode from base64
    const jwkString = atob(publicKeyString);
    const jwk = JSON.parse(jwkString);

    // Import as RSA-OAEP public key
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false, // not extractable
      ['encrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing public key:', error);
    throw new Error('Failed to import public key');
  }
}

/**
 * Import a private key from string format
 * @param privateKeyString Base64 encoded private key
 * @returns CryptoKey object
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  try {
    // Decode from base64
    const jwkString = atob(privateKeyString);
    const jwk = JSON.parse(jwkString);

    // Import as RSA-OAEP private key
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false, // not extractable
      ['decrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing private key:', error);
    throw new Error('Failed to import private key');
  }
}

/**
 * Import a symmetric key from string format
 * @param symmetricKeyString Base64 encoded symmetric key
 * @returns CryptoKey object
 */
export async function importSymmetricKey(symmetricKeyString: string): Promise<CryptoKey> {
  try {
    // Decode from base64
    const keyBuffer = base64ToArrayBuffer(symmetricKeyString);

    // Import as AES-GCM key
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // not extractable
      ['encrypt', 'decrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing symmetric key:', error);
    throw new Error('Failed to import symmetric key');
  }
}

/**
 * Encrypt a symmetric key with a public key
 * @param symmetricKey The symmetric key to encrypt
 * @param publicKey The public key to encrypt with
 * @returns Encrypted symmetric key as a base64 string
 */
export async function encryptSymmetricKey(
  symmetricKey: string,
  publicKey: CryptoKey
): Promise<string> {
  try {
    // Convert symmetric key from base64 to ArrayBuffer
    const keyBuffer = base64ToArrayBuffer(symmetricKey);

    // Encrypt the symmetric key with the public key
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      keyBuffer
    );

    // Convert to base64 for storage
    return arrayBufferToBase64(encryptedBuffer);
  } catch (error) {
    console.error('Error encrypting symmetric key:', error);
    throw new Error('Failed to encrypt symmetric key');
  }
}

/**
 * Decrypt a symmetric key with a private key
 * @param encryptedSymmetricKey The encrypted symmetric key (base64 string)
 * @param privateKey The private key to decrypt with
 * @returns Decrypted symmetric key as a string
 */
export async function decryptSymmetricKey(
  encryptedSymmetricKey: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    // Convert from base64 to ArrayBuffer
    const encryptedBuffer = base64ToArrayBuffer(encryptedSymmetricKey);

    // Decrypt with the private key
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedBuffer
    );

    // Convert to base64 string
    return arrayBufferToBase64(decryptedBuffer);
  } catch (error) {
    console.error('Error decrypting symmetric key:', error);
    throw new Error('Failed to decrypt symmetric key');
  }
}

/**
 * Encrypt a message with a symmetric key
 * @param message The message to encrypt
 * @param symmetricKey The symmetric key to encrypt with
 * @returns Encrypted message as a base64 string with IV prepended
 */
export async function encryptMessage(
  message: string,
  symmetricKey: CryptoKey
): Promise<string> {
  try {
    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);

    // Generate a random initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the message
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      symmetricKey,
      messageBuffer
    );

    // Prepend the IV to the encrypted data
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64 for storage
    return arrayBufferToBase64(result.buffer);
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message with a symmetric key
 * @param encryptedMessage The encrypted message (base64 string with IV prepended)
 * @param symmetricKey The symmetric key to decrypt with
 * @returns Decrypted message as a string
 */
export async function decryptMessage(
  encryptedMessage: string,
  symmetricKey: CryptoKey
): Promise<string> {
  try {
    // Convert from base64 to ArrayBuffer
    const encryptedBuffer = base64ToArrayBuffer(encryptedMessage);
    
    // Extract the IV (first 12 bytes)
    const iv = new Uint8Array(encryptedBuffer, 0, 12);
    
    // Extract the encrypted data (everything after the IV)
    const data = new Uint8Array(encryptedBuffer, 12);

    // Decrypt the message
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      symmetricKey,
      data
    );

    // Convert the decrypted data back to a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Convert an ArrayBuffer to a base64 string
 * @param buffer ArrayBuffer to convert
 * @returns Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to an ArrayBuffer
 * @param base64 Base64 string to convert
 * @returns ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if a message is encrypted
 * @param message The message to check
 * @returns True if the message appears to be encrypted
 */
export function isMessageEncrypted(message: string): boolean {
  try {
    // Try to decode as base64
    const decoded = atob(message);
    
    // If we can decode and the length is reasonable (has IV + data)
    // Assume it's an encrypted message
    return decoded.length > 12;
  } catch (error) {
    // If it's not valid base64, it's definitely not encrypted
    return false;
  }
}