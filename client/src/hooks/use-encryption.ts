import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  generateKeyPair,
  generateSymmetricKey,
  importPublicKey,
  importPrivateKey,
  importSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  encryptMessage,
  decryptMessage,
  isMessageEncrypted
} from '@/lib/encryption-client';
import { useToast } from '@/hooks/use-toast';

// Local storage keys
const PRIVATE_KEY_STORAGE_KEY = 'encryption_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'encryption_public_key';

interface UseEncryptionOptions {
  userId: number;
  otherUserId: number;
}

export function useEncryption({ userId, otherUserId }: UseEncryptionOptions) {
  const [initialized, setInitialized] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if the conversation has encryption enabled
  const { data: encryptionStatus, isLoading: isCheckingEncryption } = useQuery({
    queryKey: ['/api/encryption/check-encryption', otherUserId],
    queryFn: async () => {
      const response = await fetch(`/api/encryption/check-encryption?userId=${otherUserId}`);
      if (!response.ok) {
        throw new Error('Failed to check encryption status');
      }
      return response.json();
    },
    enabled: initialized && !!userId && !!otherUserId,
  });

  // Get other user's public key if needed
  const { data: otherUserPublicKey, isLoading: isLoadingOtherUserKey } = useQuery({
    queryKey: ['/api/encryption/keys', otherUserId],
    queryFn: async () => {
      const response = await fetch(`/api/encryption/keys/${otherUserId}`);
      if (!response.ok) {
        // If 404, the other user doesn't have a key yet, which is fine
        if (response.status === 404) {
          return { publicKey: null };
        }
        throw new Error('Failed to get other user\'s public key');
      }
      return response.json();
    },
    enabled: initialized && !!userId && !!otherUserId && (isEncryptionEnabled || encryptionStatus?.canEnable),
  });

  // Get conversation key if encryption is enabled
  const { data: conversationKey, isLoading: isLoadingConversationKey } = useQuery({
    queryKey: ['/api/encryption/key', otherUserId],
    queryFn: async () => {
      const response = await fetch(`/api/encryption/key?userId=${otherUserId}`);
      if (!response.ok) {
        // If 404, there's no key yet, which means encryption needs to be initiated
        if (response.status === 404) {
          return { encryptedKey: null };
        }
        throw new Error('Failed to get conversation key');
      }
      return response.json();
    },
    enabled: initialized && !!userId && !!otherUserId && isEncryptionEnabled,
  });

  // Store public key
  const storePublicKeyMutation = useMutation({
    mutationFn: async (publicKey: string) => {
      const response = await fetch('/api/encryption/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicKey }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to store public key');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries that might depend on this
      queryClient.invalidateQueries({ 
        queryKey: ['/api/encryption/keys', userId] 
      });
    },
  });

  // Initiate encryption for a conversation
  const initiateEncryptionMutation = useMutation({
    mutationFn: async (params: { encryptedSymmetricKey: string }) => {
      const response = await fetch('/api/encryption/initiate-encryption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: otherUserId,
          publicKey: publicKey,
          encryptedSymmetricKey: params.encryptedSymmetricKey,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate encryption');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries that might depend on this
      queryClient.invalidateQueries({ 
        queryKey: ['/api/encryption/check-encryption', otherUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/encryption/key', otherUserId] 
      });
      
      // Update local state
      setIsEncryptionEnabled(true);
      toast({
        title: 'Encryption Enabled',
        description: 'End-to-end encryption has been enabled for this conversation.',
        variant: 'default',
      });
    },
  });

  // Load keys from local storage
  useEffect(() => {
    const storedPrivateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    const storedPublicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    
    if (storedPrivateKey && storedPublicKey) {
      setPrivateKey(storedPrivateKey);
      setPublicKey(storedPublicKey);
      setHasKeys(true);
    }
    
    setInitialized(true);
    setIsLoading(false);
  }, []);

  // Update encryption status when the data changes
  useEffect(() => {
    if (encryptionStatus) {
      setIsEncryptionEnabled(encryptionStatus.isEncrypted);
    }
  }, [encryptionStatus]);

  // Generate new keys for the user
  const generateKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const { publicKey, privateKey } = await generateKeyPair();
      
      // Store in local storage
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey);
      localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKey);
      
      // Update state
      setPrivateKey(privateKey);
      setPublicKey(publicKey);
      setHasKeys(true);
      
      // Store public key on server
      await storePublicKeyMutation.mutateAsync(publicKey);
      
      toast({
        title: 'Keys Generated',
        description: 'Your encryption keys have been generated successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error generating keys:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate encryption keys. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [storePublicKeyMutation, toast]);

  // Enable encryption for a conversation
  const enableEncryption = useCallback(async () => {
    if (!hasKeys || !publicKey || !privateKey || !otherUserPublicKey?.publicKey) {
      toast({
        title: 'Cannot Enable Encryption',
        description: 'Both you and the other user need to have generated keys first.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Generate a symmetric key for this conversation
      const symmetricKey = await generateSymmetricKey();
      
      // Import the other user's public key
      const importedPublicKey = await importPublicKey(otherUserPublicKey.publicKey);
      
      // Encrypt the symmetric key with the other user's public key
      const encryptedSymmetricKey = await encryptSymmetricKey(symmetricKey, importedPublicKey);
      
      // Store the encrypted key on the server
      await initiateEncryptionMutation.mutateAsync({ encryptedSymmetricKey });
      
      // Store the symmetric key locally (encrypted with our own public key)
      const ownPublicKey = await importPublicKey(publicKey);
      const encryptedForSelf = await encryptSymmetricKey(symmetricKey, ownPublicKey);
      localStorage.setItem(`sym_key_${otherUserId}`, encryptedForSelf);
      
    } catch (error) {
      console.error('Error enabling encryption:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable encryption. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    hasKeys, 
    publicKey, 
    privateKey, 
    otherUserId, 
    otherUserPublicKey?.publicKey, 
    initiateEncryptionMutation,
    toast
  ]);

  // Encrypt a message
  const encryptMessageText = useCallback(async (
    messageText: string
  ): Promise<string> => {
    if (!isEncryptionEnabled || !privateKey) {
      return messageText;
    }
    
    try {
      // Get the symmetric key for this conversation
      let symmetricKeyString: string | null = null;
      
      // First try to get from local storage (faster)
      const cachedKey = localStorage.getItem(`sym_key_${otherUserId}`);
      if (cachedKey) {
        // Decrypt the cached key with our private key
        const importedPrivateKey = await importPrivateKey(privateKey);
        symmetricKeyString = await decryptSymmetricKey(cachedKey, importedPrivateKey);
      } 
      // If not in cache, get from server
      else if (conversationKey?.encryptedKey) {
        const importedPrivateKey = await importPrivateKey(privateKey);
        symmetricKeyString = await decryptSymmetricKey(
          conversationKey.encryptedKey,
          importedPrivateKey
        );
        
        // Cache for future use
        if (symmetricKeyString && publicKey) {
          const ownPublicKey = await importPublicKey(publicKey);
          const encryptedForSelf = await encryptSymmetricKey(symmetricKeyString, ownPublicKey);
          localStorage.setItem(`sym_key_${otherUserId}`, encryptedForSelf);
        }
      }
      
      if (!symmetricKeyString) {
        console.error('No symmetric key available for encryption');
        return messageText;
      }
      
      // Import the symmetric key
      const symmetricKey = await importSymmetricKey(symmetricKeyString);
      
      // Encrypt the message
      return await encryptMessage(messageText, symmetricKey);
    } catch (error) {
      console.error('Error encrypting message:', error);
      return messageText;
    }
  }, [isEncryptionEnabled, privateKey, otherUserId, conversationKey, publicKey]);

  // Decrypt a message
  const decryptMessageText = useCallback(async (
    encryptedText: string
  ): Promise<string> => {
    if (!isEncryptionEnabled || !privateKey || !isMessageEncrypted(encryptedText)) {
      return encryptedText;
    }
    
    try {
      // Get the symmetric key for this conversation
      let symmetricKeyString: string | null = null;
      
      // First try to get from local storage (faster)
      const cachedKey = localStorage.getItem(`sym_key_${otherUserId}`);
      if (cachedKey) {
        // Decrypt the cached key with our private key
        const importedPrivateKey = await importPrivateKey(privateKey);
        symmetricKeyString = await decryptSymmetricKey(cachedKey, importedPrivateKey);
      } 
      // If not in cache, get from server
      else if (conversationKey?.encryptedKey) {
        const importedPrivateKey = await importPrivateKey(privateKey);
        symmetricKeyString = await decryptSymmetricKey(
          conversationKey.encryptedKey,
          importedPrivateKey
        );
        
        // Cache for future use
        if (symmetricKeyString && publicKey) {
          const ownPublicKey = await importPublicKey(publicKey);
          const encryptedForSelf = await encryptSymmetricKey(symmetricKeyString, ownPublicKey);
          localStorage.setItem(`sym_key_${otherUserId}`, encryptedForSelf);
        }
      }
      
      if (!symmetricKeyString) {
        console.error('No symmetric key available for decryption');
        return encryptedText;
      }
      
      // Import the symmetric key
      const symmetricKey = await importSymmetricKey(symmetricKeyString);
      
      // Decrypt the message
      return await decryptMessage(encryptedText, symmetricKey);
    } catch (error) {
      console.error('Error decrypting message:', error);
      return '[Encrypted message - cannot decrypt]';
    }
  }, [isEncryptionEnabled, privateKey, otherUserId, conversationKey, publicKey]);

  return {
    isLoading: isLoading || isCheckingEncryption || isLoadingOtherUserKey || isLoadingConversationKey,
    hasKeys,
    isEncryptionEnabled,
    canEnableEncryption: encryptionStatus?.canEnable && hasKeys && !!otherUserPublicKey?.publicKey,
    otherUserHasKeys: !!otherUserPublicKey?.publicKey,
    generateKeys,
    enableEncryption,
    encryptMessage: encryptMessageText,
    decryptMessage: decryptMessageText,
  };
}