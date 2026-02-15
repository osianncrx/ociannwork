/**
 * User Key Manager Service
 * Handles RSA key pair generation and management for E2E encryption per user
 * Each user gets a unique public/private key pair upon login or signup
 */

interface KeyPair {
  publicKey: string
  privateKey: string
}

class UserKeyManagerService {
  private readonly PRIVATE_KEY_STORAGE = 'user_e2e_private_key'
  private readonly PUBLIC_KEY_STORAGE = 'user_e2e_public_key'
  private readonly KEY_GENERATED_FLAG = 'user_e2e_key_generated'

  /**
   * Generate RSA key pair for the user
   * Uses Web Crypto API to generate a 2048-bit RSA-OAEP key pair
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate RSA key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      )

      // Export public key
      const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
      const publicKeyBase64 = this.arrayBufferToBase64(exportedPublicKey)

      // Export private key
      const exportedPrivateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
      const privateKeyBase64 = this.arrayBufferToBase64(exportedPrivateKey)

      return {
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
      }
    } catch (error) {
      throw new Error('Failed to generate encryption keys')
    }
  }

  /**
   * Store the key pair in localStorage
   */
  storeKeyPair(keyPair: KeyPair): void {
    try {
      localStorage.setItem(this.PRIVATE_KEY_STORAGE, keyPair.privateKey)
      localStorage.setItem(this.PUBLIC_KEY_STORAGE, keyPair.publicKey)
      localStorage.setItem(this.KEY_GENERATED_FLAG, 'true')
    } catch (error) {
      throw new Error('Failed to store encryption keys')
    }
  }

  /**
   * Get stored public key
   */
  getPublicKey(): string | null {
    return localStorage.getItem(this.PUBLIC_KEY_STORAGE)
  }

  /**
   * Get stored private key
   */
  getPrivateKey(): string | null {
    return localStorage.getItem(this.PRIVATE_KEY_STORAGE)
  }

  /**
   * Check if user already has a key pair
   */
  hasKeyPair(): boolean {
    const hasPrivate = !!localStorage.getItem(this.PRIVATE_KEY_STORAGE)
    const hasPublic = !!localStorage.getItem(this.PUBLIC_KEY_STORAGE)
    return hasPrivate && hasPublic
  }

  /**
   * Clear all stored keys
   */
  clearKeys(): void {
    localStorage.removeItem(this.PRIVATE_KEY_STORAGE)
    localStorage.removeItem(this.PUBLIC_KEY_STORAGE)
    localStorage.removeItem(this.KEY_GENERATED_FLAG)
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * @param base64 - Base64 encoded string
   * @returns ArrayBuffer representation of the string
   */
  // @ts-ignore - Utility method for future use
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

export const userKeyManagerService = new UserKeyManagerService()
