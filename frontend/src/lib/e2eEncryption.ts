/**
 * End-to-End Encryption Utilities
 * Provides client-side encryption/decryption for secure messaging
 * Uses Web Crypto API for RSA-OAEP and AES-GCM encryption
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SerializedKeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded (should stay client-side only)
}

export interface EncryptedMessage {
  encryptedContent: string; // Base64 encoded encrypted data
  encryptedKey: string; // Base64 encoded encrypted AES key
  iv: string; // Base64 encoded initialization vector
  algorithm: string;
  keyId: string; // Public key fingerprint for key identification
}

export class E2EEncryption {
  private static readonly RSA_KEY_SIZE = 2048;
  private static readonly AES_KEY_SIZE = 256;
  private static readonly RSA_ALGORITHM = 'RSA-OAEP';
  private static readonly AES_ALGORITHM = 'AES-GCM';

  /**
   * Generate a new RSA key pair for end-to-end encryption
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: this.RSA_ALGORITHM,
          modulusLength: this.RSA_KEY_SIZE,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Export key pair to base64 strings for storage
   */
  static async exportKeyPair(keyPair: KeyPair): Promise<SerializedKeyPair> {
    try {
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: this.arrayBufferToBase64(publicKeyBuffer),
        privateKey: this.arrayBufferToBase64(privateKeyBuffer)
      };
    } catch (error) {
      console.error('Failed to export key pair:', error);
      throw new Error('Key export failed');
    }
  }

  /**
   * Import key pair from base64 strings
   */
  static async importKeyPair(serialized: SerializedKeyPair): Promise<KeyPair> {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(serialized.publicKey);
      const privateKeyBuffer = this.base64ToArrayBuffer(serialized.privateKey);

      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: this.RSA_ALGORITHM,
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: this.RSA_ALGORITHM,
          hash: 'SHA-256'
        },
        true,
        ['decrypt']
      );

      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to import key pair:', error);
      throw new Error('Key import failed');
    }
  }

  /**
   * Import public key from base64 string
   */
  static async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
      
      return await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: this.RSA_ALGORITHM,
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Public key import failed');
    }
  }

  /**
   * Encrypt a message for a specific recipient
   */
  static async encryptMessage(
    message: string,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedMessage> {
    try {
      // Generate a random AES key for this message
      const aesKey = await crypto.subtle.generateKey(
        {
          name: this.AES_ALGORITHM,
          length: this.AES_KEY_SIZE
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate random IV for AES
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

      // Encrypt the message with AES
      const messageBuffer = new TextEncoder().encode(message);
      const encryptedMessage = await crypto.subtle.encrypt(
        {
          name: this.AES_ALGORITHM,
          iv: iv
        },
        aesKey,
        messageBuffer
      );

      // Export the AES key and encrypt it with recipient's RSA public key
      const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);
      const encryptedAesKey = await crypto.subtle.encrypt(
        {
          name: this.RSA_ALGORITHM
        },
        recipientPublicKey,
        aesKeyBuffer
      );

      // Generate key ID for the public key
      const keyId = await this.generateKeyId(recipientPublicKey);

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedMessage),
        encryptedKey: this.arrayBufferToBase64(encryptedAesKey),
        iv: this.arrayBufferToBase64(iv.buffer),
        algorithm: `${this.RSA_ALGORITHM}+${this.AES_ALGORITHM}`,
        keyId
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt a message using private key
   */
  static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    privateKey: CryptoKey
  ): Promise<string> {
    try {
      // Decrypt the AES key using RSA private key
      const encryptedAesKeyBuffer = this.base64ToArrayBuffer(encryptedMessage.encryptedKey);
      const aesKeyBuffer = await crypto.subtle.decrypt(
        {
          name: this.RSA_ALGORITHM
        },
        privateKey,
        encryptedAesKeyBuffer
      );

      // Import the decrypted AES key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        {
          name: this.AES_ALGORITHM,
          length: this.AES_KEY_SIZE
        },
        false,
        ['decrypt']
      );

      // Decrypt the message using AES key
      const encryptedContentBuffer = this.base64ToArrayBuffer(encryptedMessage.encryptedContent);
      const ivBuffer = this.base64ToArrayBuffer(encryptedMessage.iv);
      
      const decryptedMessage = await crypto.subtle.decrypt(
        {
          name: this.AES_ALGORITHM,
          iv: ivBuffer
        },
        aesKey,
        encryptedContentBuffer
      );

      return new TextDecoder().decode(decryptedMessage);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Generate a fingerprint/ID for a public key
   */
  static async generateKeyId(publicKey: CryptoKey): Promise<string> {
    try {
      const keyBuffer = await crypto.subtle.exportKey('spki', publicKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
      
      // Take first 8 bytes and convert to hex
      const hashArray = new Uint8Array(hashBuffer);
      const keyId = Array.from(hashArray.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return keyId;
    } catch (error) {
      console.error('Failed to generate key ID:', error);
      throw new Error('Key ID generation failed');
    }
  }

  /**
   * Verify if a message was encrypted for a specific key
   */
  static async verifyKeyId(publicKey: CryptoKey, keyId: string): Promise<boolean> {
    try {
      const generatedKeyId = await this.generateKeyId(publicKey);
      return generatedKeyId === keyId;
    } catch (error) {
      console.error('Failed to verify key ID:', error);
      return false;
    }
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if encryption is supported in current environment
   */
  static isSupported(): boolean {
    return !!(
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.subtle.generateKey === 'function' &&
      typeof crypto.subtle.encrypt === 'function' &&
      typeof crypto.subtle.decrypt === 'function'
    );
  }

  /**
   * Generate a simple test to verify encryption/decryption works
   */
  static async testEncryption(): Promise<boolean> {
    try {
      const keyPair = await this.generateKeyPair();
      const testMessage = 'Hello, E2E Encryption!';
      
      const encrypted = await this.encryptMessage(testMessage, keyPair.publicKey);
      const decrypted = await this.decryptMessage(encrypted, keyPair.privateKey);
      
      return decrypted === testMessage;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}

/**
 * Key management utilities for client-side storage
 */
export class KeyManager {
  private static readonly PRIVATE_KEY_STORAGE_KEY = 'e2e_private_key';
  private static readonly PUBLIC_KEY_STORAGE_KEY = 'e2e_public_key';
  private static readonly KNOWN_KEYS_STORAGE_KEY = 'e2e_known_public_keys';

  /**
   * Generate and store a new key pair for the current user
   */
  static async generateAndStoreKeyPair(): Promise<SerializedKeyPair> {
    const keyPair = await E2EEncryption.generateKeyPair();
    const serialized = await E2EEncryption.exportKeyPair(keyPair);
    
    // Store keys in localStorage (private key should be encrypted in production)
    localStorage.setItem(this.PRIVATE_KEY_STORAGE_KEY, serialized.privateKey);
    localStorage.setItem(this.PUBLIC_KEY_STORAGE_KEY, serialized.publicKey);
    
    return serialized;
  }

  /**
   * Get the current user's key pair from storage
   */
  static async getStoredKeyPair(): Promise<KeyPair | null> {
    try {
      const privateKeyBase64 = localStorage.getItem(this.PRIVATE_KEY_STORAGE_KEY);
      const publicKeyBase64 = localStorage.getItem(this.PUBLIC_KEY_STORAGE_KEY);
      
      if (!privateKeyBase64 || !publicKeyBase64) {
        return null;
      }
      
      return await E2EEncryption.importKeyPair({
        privateKey: privateKeyBase64,
        publicKey: publicKeyBase64
      });
    } catch (error) {
      console.error('Failed to retrieve stored key pair:', error);
      return null;
    }
  }

  /**
   * Get the current user's public key
   */
  static getStoredPublicKey(): string | null {
    return localStorage.getItem(this.PUBLIC_KEY_STORAGE_KEY);
  }

  /**
   * Store a known public key for another user
   */
  static storePublicKey(userId: string, publicKey: string): void {
    const knownKeys = this.getKnownPublicKeys();
    knownKeys[userId] = {
      publicKey,
      addedAt: new Date().toISOString()
    };
    
    localStorage.setItem(this.KNOWN_KEYS_STORAGE_KEY, JSON.stringify(knownKeys));
  }

  /**
   * Get a known public key for a user
   */
  static getPublicKey(userId: string): string | null {
    const knownKeys = this.getKnownPublicKeys();
    return knownKeys[userId]?.publicKey || null;
  }

  /**
   * Get all known public keys
   */
  static getKnownPublicKeys(): Record<string, { publicKey: string; addedAt: string }> {
    try {
      const stored = localStorage.getItem(this.KNOWN_KEYS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to retrieve known public keys:', error);
      return {};
    }
  }

  /**
   * Clear all stored keys (for logout/reset)
   */
  static clearAllKeys(): void {
    localStorage.removeItem(this.PRIVATE_KEY_STORAGE_KEY);
    localStorage.removeItem(this.PUBLIC_KEY_STORAGE_KEY);
    localStorage.removeItem(this.KNOWN_KEYS_STORAGE_KEY);
  }

  /**
   * Check if user has encryption keys set up
   */
  static hasKeys(): boolean {
    return !!(
      localStorage.getItem(this.PRIVATE_KEY_STORAGE_KEY) &&
      localStorage.getItem(this.PUBLIC_KEY_STORAGE_KEY)
    );
  }
}