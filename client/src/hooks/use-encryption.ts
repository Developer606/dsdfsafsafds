import { useState, useEffect, useCallback } from 'react';
import * as encryptionClient from '@/lib/encryption-client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing message encryption in conversations
 * @param userId Current user ID
 * @param otherUserId ID of the conversation partner
 * @returns Encryption utilities and state
 */
export function useEncryption(userId: number, otherUserId: number) {
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [isSettingUpEncryption, setIsSettingUpEncryption] = useState(false);
  const [conversationKey, setConversationKey] = useState<CryptoKey | null>(null);
  const { toast } = useToast();

  // Check if encryption is enabled for this conversation
  useEffect(() => {
    async function checkEncryptionStatus() {
      if (!userId || !otherUserId) return;
      
      try {
        const response = await fetch(`/api/conversations/check-encryption?user1Id=${userId}&user2Id=${otherUserId}`);
        const data = await response.json();
        
        if (data.encryptionEnabled) {
          setIsEncryptionEnabled(true);
          
          // Try to get and import the conversation key
          try {
            // Get the private key from storage
            const privateKeyString = localStorage.getItem(`privateKey_${userId}`);
            if (!privateKeyString) {
              console.error('Private key not found');
              return;
            }
            
            // Import the private key
            const privateKey = await encryptionClient.importPrivateKey(privateKeyString);
            
            // Get the encrypted conversation key
            const response = await fetch(`/api/conversations/key?userId=${userId}&otherUserId=${otherUserId}`);
            const { encryptedKey } = await response.json();
            
            // Decrypt the conversation key
            const decryptedKeyString = await encryptionClient.decryptWithPrivateKey(
              encryptedKey,
              privateKey
            );
            
            // Import the symmetric key
            const symmetricKey = await encryptionClient.importSymmetricKey(decryptedKeyString);
            setConversationKey(symmetricKey);
          } catch (error) {
            console.error('Error importing conversation key:', error);
          }
        }
      } catch (error) {
        console.error('Error checking encryption status:', error);
      }
    }
    
    checkEncryptionStatus();
  }, [userId, otherUserId]);

  // Function to enable encryption for a conversation
  const enableEncryption = useCallback(async () => {
    if (!userId || !otherUserId || isEncryptionEnabled) return;
    
    setIsSettingUpEncryption(true);
    
    try {
      // Generate a key pair for the user
      const keyPair = await encryptionClient.generateKeyPair();
      const publicKeyString = await encryptionClient.exportPublicKey(keyPair.publicKey);
      const privateKeyString = await encryptionClient.exportPrivateKey(keyPair.privateKey);
      
      // Store private key securely
      localStorage.setItem(`privateKey_${userId}`, privateKeyString);
      
      // Send public key to server
      const response = await fetch('/api/conversations/initiate-encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          otherUserId,
          publicKey: publicKeyString,
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'encryption_enabled') {
        setIsEncryptionEnabled(true);
        
        // Get the conversation key
        const keyResponse = await fetch(`/api/conversations/key?userId=${userId}&otherUserId=${otherUserId}`);
        const { encryptedKey } = await keyResponse.json();
        
        // Decrypt the conversation key
        const decryptedKeyString = await encryptionClient.decryptWithPrivateKey(
          encryptedKey,
          keyPair.privateKey
        );
        
        // Import the symmetric key
        const symmetricKey = await encryptionClient.importSymmetricKey(decryptedKeyString);
        setConversationKey(symmetricKey);
        
        toast({
          title: 'Encryption Enabled',
          description: 'Your messages are now end-to-end encrypted',
        });
      } else if (data.status === 'waiting_for_recipient') {
        toast({
          title: 'Encryption Pending',
          description: 'Waiting for the other user to enable encryption',
        });
      }
    } catch (error) {
      console.error('Error enabling encryption:', error);
      toast({
        title: 'Encryption Failed',
        description: 'Could not enable end-to-end encryption',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUpEncryption(false);
    }
  }, [userId, otherUserId, isEncryptionEnabled, toast]);

  // Function to encrypt a message
  const encryptMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isEncryptionEnabled || !conversationKey) {
        return message;
      }
      
      try {
        return await encryptionClient.encryptMessage(message, conversationKey);
      } catch (error) {
        console.error('Error encrypting message:', error);
        toast({
          title: 'Encryption Error',
          description: 'Failed to encrypt message',
          variant: 'destructive',
        });
        return message;
      }
    },
    [isEncryptionEnabled, conversationKey, toast]
  );

  // Function to decrypt a message
  const decryptMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isEncryptionEnabled || !conversationKey) {
        return message;
      }
      
      try {
        // Check if the message is encrypted
        if (encryptionClient.isEncryptedMessage(message)) {
          return await encryptionClient.decryptMessage(message, conversationKey);
        }
        
        // Not encrypted, return as is
        return message;
      } catch (error) {
        console.error('Error decrypting message:', error);
        return '[Encrypted message]';
      }
    },
    [isEncryptionEnabled, conversationKey]
  );

  return {
    isEncryptionEnabled,
    isSettingUpEncryption,
    enableEncryption,
    encryptMessage,
    decryptMessage,
  };
}