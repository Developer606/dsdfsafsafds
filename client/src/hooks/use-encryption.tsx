import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  generateKeyPair, exportPublicKey, exportPrivateKey,
  importPublicKey, importPrivateKey, generateAESKey,
  encryptMessage, decryptMessage, encryptAESKey, decryptAESKey,
  isMessageEncrypted
} from '@/lib/encryption-client';
import { apiRequest } from '@/lib/queryClient';

interface EncryptionState {
  isEncryptionEnabled: boolean;
  isInitialized: boolean;
  publicKey: CryptoKey | null;
  privateKey: CryptoKey | null;
  recipientPublicKey: CryptoKey | null;
  conversationKey: CryptoKey | null;
}

const LOCAL_STORAGE_KEYS = {
  PRIVATE_KEY: 'user_private_key',
  PUBLIC_KEY: 'user_public_key',
};

/**
 * React hook for managing encryption functionality
 * Handles key generation, storage, and message encryption/decryption
 * @param userId The current user's ID
 * @param conversationPartnerUserId The ID of the user being conversed with
 */
export function useEncryption(userId: number, conversationPartnerUserId: number) {
  const { toast } = useToast();
  const [state, setState] = useState<EncryptionState>({
    isEncryptionEnabled: false,
    isInitialized: false,
    publicKey: null,
    privateKey: null,
    recipientPublicKey: null,
    conversationKey: null,
  });

  // Initialize encryption if available keys in localStorage
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const storedPrivateKey = localStorage.getItem(`${LOCAL_STORAGE_KEYS.PRIVATE_KEY}_${userId}`);
        const storedPublicKey = localStorage.getItem(`${LOCAL_STORAGE_KEYS.PUBLIC_KEY}_${userId}`);
        
        if (storedPrivateKey && storedPublicKey) {
          const privateKey = await importPrivateKey(storedPrivateKey);
          const publicKey = await importPublicKey(storedPublicKey);
          
          setState(prevState => ({
            ...prevState,
            privateKey,
            publicKey,
            isInitialized: true,
          }));
        }
      } catch (error) {
        console.error("Error initializing encryption from storage:", error);
      }
    };

    initializeFromStorage();
  }, [userId]);

  // Check if encryption is enabled for this conversation
  useEffect(() => {
    const checkEncryptionStatus = async () => {
      if (!userId || !conversationPartnerUserId) return;
      
      try {
        const response = await apiRequest(`/api/encryption/check-encryption?partnerId=${conversationPartnerUserId}`);
        
        if (response.isEncryptionEnabled) {
          setState(prevState => ({
            ...prevState,
            isEncryptionEnabled: true,
          }));
          
          // If encryption is enabled, get the encrypted key
          const keyResponse = await apiRequest(`/api/encryption/key?partnerId=${conversationPartnerUserId}`);
          
          if (keyResponse.key && state.privateKey) {
            // Decrypt the conversation key
            const conversationKey = await decryptAESKey(keyResponse.key, state.privateKey);
            
            setState(prevState => ({
              ...prevState,
              conversationKey,
            }));
          }
        }
      } catch (error) {
        console.error("Error checking encryption status:", error);
      }
    };
    
    if (state.isInitialized) {
      checkEncryptionStatus();
    }
  }, [userId, conversationPartnerUserId, state.isInitialized, state.privateKey]);

  // Generate new encryption keys
  const generateKeys = useCallback(async () => {
    try {
      const keyPair = await generateKeyPair();
      const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
      const exportedPrivateKey = await exportPrivateKey(keyPair.privateKey);
      
      // Store keys in localStorage
      localStorage.setItem(`${LOCAL_STORAGE_KEYS.PUBLIC_KEY}_${userId}`, exportedPublicKey);
      localStorage.setItem(`${LOCAL_STORAGE_KEYS.PRIVATE_KEY}_${userId}`, exportedPrivateKey);
      
      // Update state
      setState(prevState => ({
        ...prevState,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        isInitialized: true,
      }));
      
      // Upload public key to server
      await apiRequest('/api/encryption/keys', {
        method: 'POST',
        data: { publicKey: exportedPublicKey },
      });
      
      return true;
    } catch (error) {
      console.error("Error generating encryption keys:", error);
      toast({
        title: "Error",
        description: "Failed to generate encryption keys",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, toast]);

  // Enable encryption for the current conversation
  const enableEncryption = useCallback(async () => {
    if (!state.publicKey || !state.privateKey) {
      const keysGenerated = await generateKeys();
      if (!keysGenerated) return false;
    }
    
    try {
      // Get recipient's public key
      const response = await apiRequest(`/api/encryption/keys/${conversationPartnerUserId}`);
      
      if (!response.publicKey) {
        toast({
          title: "Error",
          description: "Recipient has not enabled encryption yet",
          variant: "destructive",
        });
        return false;
      }
      
      // Import recipient's public key
      const recipientPublicKey = await importPublicKey(response.publicKey);
      
      // Generate a conversation key (AES)
      const conversationKey = await generateAESKey();
      
      // Encrypt conversation key with recipient's public key
      const encryptedKey = await encryptAESKey(conversationKey, recipientPublicKey);
      
      // Send the encrypted key to the server
      await apiRequest('/api/encryption/initiate-encryption', {
        method: 'POST',
        data: {
          partnerId: conversationPartnerUserId,
          encryptedKey,
        },
      });
      
      // Update state
      setState(prevState => ({
        ...prevState,
        isEncryptionEnabled: true,
        recipientPublicKey,
        conversationKey,
      }));
      
      toast({
        title: "Success",
        description: "End-to-end encryption enabled for this conversation",
      });
      
      return true;
    } catch (error) {
      console.error("Error enabling encryption:", error);
      toast({
        title: "Error",
        description: "Failed to enable encryption",
        variant: "destructive",
      });
      return false;
    }
  }, [
    state.publicKey, 
    state.privateKey, 
    conversationPartnerUserId, 
    generateKeys, 
    toast
  ]);

  // Encrypt a message before sending
  const encryptMessageText = useCallback(async (message: string) => {
    if (!state.conversationKey) {
      throw new Error("Conversation key not available");
    }
    
    return encryptMessage(message, state.conversationKey);
  }, [state.conversationKey]);

  // Decrypt a received message
  const decryptMessageText = useCallback(async (encryptedMessage: string) => {
    if (!state.conversationKey) {
      throw new Error("Conversation key not available");
    }
    
    if (!isMessageEncrypted(encryptedMessage)) {
      return encryptedMessage; // Message is not encrypted
    }
    
    return decryptMessage(encryptedMessage, state.conversationKey);
  }, [state.conversationKey]);

  return {
    isEncryptionEnabled: state.isEncryptionEnabled,
    isInitialized: state.isInitialized,
    hasKeys: !!state.publicKey && !!state.privateKey,
    generateKeys,
    enableEncryption,
    encryptMessage: encryptMessageText,
    decryptMessage: decryptMessageText,
  };
}