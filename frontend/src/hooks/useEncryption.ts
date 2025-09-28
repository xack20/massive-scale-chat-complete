/**
 * React hook for managing end-to-end encryption
 * Handles key generation, storage, and encryption state
 */

import { useCallback, useEffect, useState } from 'react';
import { E2EEncryption, EncryptedMessage, KeyManager } from '../lib/e2eEncryption';
import { useAuth } from './useAuth';

interface UseEncryptionResult {
  isSupported: boolean;
  hasKeys: boolean;
  isReady: boolean;
  publicKey: string | null;
  generateKeys: () => Promise<boolean>;
  clearKeys: () => void;
  encryptMessage: (message: string, recipientUserId: string) => Promise<string | null>;
  decryptMessage: (encryptedData: string) => Promise<string | null>;
  storePublicKey: (userId: string, publicKey: string) => void;
  getPublicKey: (userId: string) => string | null;
  exchangeKeys: (userId: string) => Promise<boolean>;
}

export function useEncryption(): UseEncryptionResult {
  const [isSupported] = useState(() => E2EEncryption.isSupported());
  const [hasKeys, setHasKeys] = useState(() => KeyManager.hasKeys());
  const [isReady, setIsReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize encryption state
    const initializeEncryption = async () => {
      if (isSupported && hasKeys) {
        const storedPublicKey = KeyManager.getStoredPublicKey();
        setPublicKey(storedPublicKey);
        setIsReady(true);
        
        // Test encryption to ensure everything works
        try {
          const testResult = await E2EEncryption.testEncryption();
          if (!testResult) {
            console.error('Encryption test failed');
            setIsReady(false);
          }
        } catch (error) {
          console.error('Encryption initialization failed:', error);
          setIsReady(false);
        }
      }
    };

    initializeEncryption();
  }, [isSupported, hasKeys]);

  const generateKeys = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const keyPair = await KeyManager.generateAndStoreKeyPair();
      setPublicKey(keyPair.publicKey);
      setHasKeys(true);
      setIsReady(true);

      // TODO: Upload public key to server for key exchange
      // This would typically involve calling an API endpoint
      console.info('Keys generated successfully. Public key should be uploaded to server.');
      
      return true;
    } catch (error) {
      console.error('Failed to generate keys:', error);
      return false;
    }
  }, [isSupported]);

  const clearKeys = useCallback(() => {
    KeyManager.clearAllKeys();
    setHasKeys(false);
    setIsReady(false);
    setPublicKey(null);
  }, []);

  const encryptMessage = useCallback(async (
    message: string, 
    recipientUserId: string
  ): Promise<string | null> => {
    if (!isReady) return null;

    try {
      const recipientPublicKeyBase64 = KeyManager.getPublicKey(recipientUserId);
      if (!recipientPublicKeyBase64) {
        console.warn(`No public key found for user ${recipientUserId}`);
        return null;
      }

      const recipientPublicKey = await E2EEncryption.importPublicKey(recipientPublicKeyBase64);
      const encrypted = await E2EEncryption.encryptMessage(message, recipientPublicKey);
      
      return JSON.stringify(encrypted);
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }, [isReady]);

  const decryptMessage = useCallback(async (encryptedData: string): Promise<string | null> => {
    if (!isReady) return null;

    try {
      const keyPair = await KeyManager.getStoredKeyPair();
      if (!keyPair) {
        console.error('No private key available for decryption');
        return null;
      }

      const encryptedMessage: EncryptedMessage = JSON.parse(encryptedData);
      const decrypted = await E2EEncryption.decryptMessage(encryptedMessage, keyPair.privateKey);
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }, [isReady]);

  const storePublicKey = useCallback((userId: string, publicKeyBase64: string) => {
    KeyManager.storePublicKey(userId, publicKeyBase64);
  }, []);

  const getPublicKey = useCallback((userId: string): string | null => {
    return KeyManager.getPublicKey(userId);
  }, []);

  const exchangeKeys = useCallback(async (userId: string): Promise<boolean> => {
    if (!isReady || !user?.id) return false;

    // TODO: Implement key exchange with server
    // This would involve:
    // 1. Fetching the user's public key from the server
    // 2. Storing it locally
    // 3. Optionally uploading our public key if not already done
    
    console.info(`Key exchange with user ${userId} would be implemented here`);
    return true;
  }, [isReady, user?.id]);

  return {
    isSupported,
    hasKeys,
    isReady,
    publicKey,
    generateKeys,
    clearKeys,
    encryptMessage,
    decryptMessage,
    storePublicKey,
    getPublicKey,
    exchangeKeys
  };
}