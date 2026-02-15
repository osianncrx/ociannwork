import CryptoJS from 'crypto-js'

/**
 * Simple message encryption service using AES
 * Derives encryption key from user's public key stored on server
 * All users with the same public key will derive the same encryption key
 */
class MessageEncryptionService {
  private readonly STORAGE_KEY = 'e2e_encryption_key'
  private encryptionKey: string | null = null

  /**
   * Initialize encryption key from public key
   * This ensures all users derive the same key from the same public key
   */
  initializeFromPublicKey(publicKey: string | null): void {
    if (!publicKey) {
      this.encryptionKey = null
      localStorage.removeItem(this.STORAGE_KEY)
      return
    }

    // Derive encryption key from public key (SHA256 hash)
    // All users with the same public key will get the same derived key
    const derivedKey = CryptoJS.SHA256(publicKey).toString()
    this.encryptionKey = derivedKey
    localStorage.setItem(this.STORAGE_KEY, derivedKey)
  }

  /**
   * Get encryption key (derived from public key)
   */
  getEncryptionKey(): string {
    if (!this.encryptionKey) {
      const key = localStorage.getItem(this.STORAGE_KEY)
      if (key) {
        this.encryptionKey = key
      } else {
        // If no key exists, return empty string (will fail gracefully)
        return ''
      }
    }
    return this.encryptionKey
  }

  /**
   * Set encryption key directly (for backward compatibility)
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key
    localStorage.setItem(this.STORAGE_KEY, key)
  }

  /**
   * Encrypt a message
   */
  encryptMessage(message: string): string {
    if (!message) return message

    try {
      const key = this.getEncryptionKey()
      if (!key) {
        console.warn('Encryption skipped: No encryption key available (public key not initialized)')
        return message
      }
      const encrypted = CryptoJS.AES.encrypt(message, key).toString()
      return encrypted
    } catch (error) {
      console.error('Encryption error:', error)
      return message
    }
  }

  /**
   * Decrypt a message
   * @param encryptedMessage - The encrypted message content
   * @param senderPublicKey - Optional: Sender's public key to derive decryption key. If not provided, uses own public key.
   */
  decryptMessage(encryptedMessage: string, senderPublicKey?: string | null): string {
    if (!encryptedMessage) return encryptedMessage

    // Check if message looks encrypted (CryptoJS format starts with "U2FsdGVkX1")
    const looksEncrypted = encryptedMessage.startsWith('U2FsdGVkX1')
    if (!looksEncrypted) {
      // Not encrypted, return as-is
      return encryptedMessage
    }

    try {
      let key: string
      
      if (senderPublicKey) {
        // Use sender's public key to derive decryption key
        key = CryptoJS.SHA256(senderPublicKey).toString()
      } else {
        // Fallback to own encryption key
        key = this.getEncryptionKey()
        if (!key) {
          console.warn('Decryption skipped: No encryption key available')
          return encryptedMessage
        }
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key)
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
      
      // If decryption failed, return original message
      if (!decryptedText || decryptedText.length === 0) {
        return encryptedMessage
      }
      
      return decryptedText
    } catch (error: any) {
      // Handle "Malformed UTF-8" error gracefully
      if (error?.message?.includes('Malformed UTF-8')) {
        return encryptedMessage
      }
      console.error('Decryption error:', error)
      return encryptedMessage
    }
  }

  /**
   * Check if a message is encrypted (heuristic check)
   */
  isEncrypted(message: string): boolean {
    // Simple check: encrypted messages typically don't contain normal text patterns
    // and have a specific format from crypto-js
    if (!message) return false
    
    // CryptoJS encrypted strings typically have a specific format
    // This is a simple heuristic
    try {
      // Try to detect if it's base64 encoded ciphertext format
      const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/
      // Encrypted messages are usually longer and base64-like
      if (message.length > 50 && base64Pattern.test(message.split(':')[0])) {
        // Try decrypting to verify
        const key = this.getEncryptionKey()
        const decrypted = CryptoJS.AES.decrypt(message, key)
        return decrypted.toString(CryptoJS.enc.Utf8).length > 0
      }
    } catch (error) {
      // Not encrypted
    }
    
    return false
  }

  /**
   * Clear encryption key
   */
  clearKey(): void {
    this.encryptionKey = null
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Generate a key from public key (for future use with RSA)
   */
  generateKeyFromPublicKey(publicKey: string): string {
    // Simple hash of public key for now
    // In production, you'd use proper key derivation
    return CryptoJS.SHA256(publicKey).toString()
  }
}

export const messageEncryptionService = new MessageEncryptionService()
