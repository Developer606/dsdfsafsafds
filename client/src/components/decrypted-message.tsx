import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface DecryptedMessageProps {
  encryptedText: string;
  decryptFn: (text: string) => Promise<string>;
}

/**
 * A component that handles decryption of encrypted messages
 * Displays a loading indicator while decryption is in progress
 * Shows the decrypted content once complete
 */
export default function DecryptedMessage({ encryptedText, decryptFn }: DecryptedMessageProps) {
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const decryptMessage = async () => {
      setIsDecrypting(true);
      try {
        // Decrypt the message using the provided function
        const decrypted = await decryptFn(encryptedText);
        
        // Only update state if the component is still mounted
        if (isMounted) {
          setDecryptedContent(decrypted);
          setIsDecrypting(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Could not decrypt message. The encryption key may be missing or invalid.');
          setIsDecrypting(false);
        }
      }
    };

    // Start decryption when the component mounts
    decryptMessage();

    // Cleanup function for when the component unmounts
    return () => {
      isMounted = false;
    };
  }, [encryptedText, decryptFn]);

  if (isDecrypting) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Decrypting message...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-amber-600 dark:text-amber-400">
        {error}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {decryptedContent}
    </div>
  );
}