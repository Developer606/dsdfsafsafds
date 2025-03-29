import { useState, useEffect, useCallback } from 'react';
import { generateKeyPair, getUserKeys, storeUserKeys } from '@/lib/encryption';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to manage encryption key generation and synchronization with the server
 */
export const useEncryption = (userId?: number) => {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('encryptionEnabled') === 'true';
  });
  
  // Get or generate local keys on mount
  useEffect(() => {
    const keys = getUserKeys();
    if (keys.publicKey && keys.secretKey && isEnabled) {
      // If we have keys and encryption is enabled, make sure server has our public key
      updateServerPublicKey(keys.publicKey);
    }
  }, [isEnabled, userId]);
  
  // Toggle encryption on/off
  const toggleEncryption = useCallback(async () => {
    const newValue = !isEnabled;
    localStorage.setItem('encryptionEnabled', newValue.toString());
    setIsEnabled(newValue);
    
    if (newValue) {
      // Make sure we have keys and server has our public key
      const keys = getUserKeys();
      await updateServerPublicKey(keys.publicKey);
    }
  }, [isEnabled]);
  
  // Mutation to update our public key on the server
  const { mutateAsync: updateServerPublicKey } = useMutation({
    mutationFn: async (publicKey: string) => {
      return apiRequest('/api/user/public-key', {
        method: 'POST',
        body: { publicKey }
      });
    }
  });
  
  // Generate new key pair (useful for key rotation)
  const regenerateKeys = useCallback(async () => {
    const keyPair = generateKeyPair();
    storeUserKeys(keyPair.publicKey, keyPair.secretKey);
    
    if (isEnabled) {
      // Update server with new public key
      await updateServerPublicKey(keyPair.publicKey);
    }
    
    return keyPair;
  }, [isEnabled, updateServerPublicKey]);
  
  // Fetch a user's public key (for sending encrypted messages to others)
  const useUserPublicKey = (otherUserId?: number) => {
    return useQuery({
      queryKey: ['/api/users/public-key', otherUserId],
      queryFn: async () => {
        if (!otherUserId) return null;
        const response = await apiRequest(`/api/users/${otherUserId}/public-key`);
        return response.publicKey;
      },
      enabled: !!otherUserId && isEnabled
    });
  };

  return {
    isEnabled,
    toggleEncryption,
    regenerateKeys,
    useUserPublicKey,
    getUserKeys
  };
};