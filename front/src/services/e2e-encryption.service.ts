/**
 * End-to-End Encryption Service for WebRTC
 * 
 * This service provides e2e encryption for WebRTC audio and video streams
 * using the Insertable Streams API and Web Crypto API.
 * 
 * The Insertable Streams API allows us to intercept and transform encoded frames
 * before they are sent over the network and after they are received.
 */

export interface EncryptionKey {
  key: CryptoKey
  keyId: string
  algorithm: string
}

// Encrypted frame structure: [keyId (32 bytes)][iv (12 bytes)][encrypted data + tag]
const KEY_ID_LENGTH = 32
const IV_LENGTH = 12

class E2EEncryptionService {
  private encryptionKeys: Map<string, EncryptionKey> = new Map()
  private decryptionKeys: Map<string, EncryptionKey> = new Map()
  private currentKeyId: string | null = null
  private readonly algorithm = 'AES-GCM'
  private readonly keyLength = 256
  private pendingKeyCallbacks: Map<string, Array<() => void>> = new Map()
  private configuredSenders: WeakSet<RTCRtpSender> = new WeakSet()
  private configuredReceivers: WeakSet<RTCRtpReceiver> = new WeakSet()

  /**
   * Check if Insertable Streams API is supported
   */
  isSupported(): boolean {
    return (
      typeof RTCRtpSender !== 'undefined' &&
      ('transform' in RTCRtpSender.prototype || 'createEncodedStreams' in RTCRtpSender.prototype) &&
      typeof RTCRtpReceiver !== 'undefined' &&
      ('transform' in RTCRtpReceiver.prototype || 'createEncodedStreams' in RTCRtpReceiver.prototype)
    )
  }

  /**
   * Generate a new encryption key for a call
   */
  async generateKey(keyId?: string): Promise<EncryptionKey> {
    const id = keyId || this.generateKeyId()
    
    const key = await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )

    const encryptionKey: EncryptionKey = {
      key,
      keyId: id,
      algorithm: this.algorithm,
    }

    this.encryptionKeys.set(id, encryptionKey)
    this.decryptionKeys.set(id, encryptionKey)
    this.currentKeyId = id

    return encryptionKey
  }

  /**
   * Import a key from raw key material (for receiving keys from other participants)
   */
  async importKey(keyMaterial: ArrayBuffer, keyId: string): Promise<EncryptionKey> {
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )

    const encryptionKey: EncryptionKey = {
      key,
      keyId,
      algorithm: this.algorithm,
    }

    this.decryptionKeys.set(keyId, encryptionKey)
    if (!this.currentKeyId) {
      this.currentKeyId = keyId
    }

    // Notify any pending callbacks waiting for this key
    const callbacks = this.pendingKeyCallbacks.get(keyId)
    if (callbacks) {
      callbacks.forEach(callback => callback())
      this.pendingKeyCallbacks.delete(keyId)
    }

    return encryptionKey
  }

  /**
   * Export a key as raw key material (for sending to other participants)
   */
  async exportKey(keyId: string): Promise<ArrayBuffer> {
    const encryptionKey = this.encryptionKeys.get(keyId) || this.decryptionKeys.get(keyId)
    if (!encryptionKey) {
      throw new Error(`Key ${keyId} not found`)
    }

    return await crypto.subtle.exportKey('raw', encryptionKey.key)
  }

  /**
   * Encrypt encoded frame data
   */
  private async encryptEncodedFrame(
    frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame,
    keyId: string
  ): Promise<void> {
    const encryptionKey = this.encryptionKeys.get(keyId)
    if (!encryptionKey) {
      throw new Error(`Encryption key ${keyId} not found`)
    }

    // Get frame data
    const frameData = frame.data

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Encrypt the frame data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv,
        tagLength: 128, // 128 bits for GCM
      },
      encryptionKey.key,
      frameData
    )

    // Create new buffer: [keyId][iv][encrypted data]
    const keyIdBytes = new TextEncoder().encode(keyId.padEnd(KEY_ID_LENGTH, '\0'))
    const totalLength = KEY_ID_LENGTH + IV_LENGTH + encryptedData.byteLength
    const encryptedFrame = new Uint8Array(totalLength)

    let offset = 0
    encryptedFrame.set(keyIdBytes, offset)
    offset += KEY_ID_LENGTH
    encryptedFrame.set(iv, offset)
    offset += IV_LENGTH
    encryptedFrame.set(new Uint8Array(encryptedData), offset)

    // Replace frame data with encrypted data
    frame.data = encryptedFrame.buffer
  }

  /**
   * Check if a frame is encrypted (has the encryption header)
   */
  private isFrameEncrypted(frameData: Uint8Array): boolean {
    // Check if frame has minimum length for encrypted frame
    if (frameData.length < KEY_ID_LENGTH + IV_LENGTH) {
      return false
    }

    // Check if first bytes contain a valid keyId (not all zeros or random data)
    const keyIdBytes = frameData.slice(0, KEY_ID_LENGTH)
    const keyId = new TextDecoder().decode(keyIdBytes).replace(/\0/g, '')
    
    // If keyId starts with "key_" it's likely encrypted by our system
    return keyId.startsWith('key_') && keyId.length > 4
  }

  /**
   * Decrypt encoded frame data
   */
  private async decryptEncodedFrame(
    frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame
  ): Promise<void> {
    const frameData = new Uint8Array(frame.data)

    // Check if frame is encrypted
    if (!this.isFrameEncrypted(frameData)) {
      // Frame is not encrypted, pass through as-is
      return
    }

    // Extract keyId, IV, and encrypted data
    const keyIdBytes = frameData.slice(0, KEY_ID_LENGTH)
    const keyId = new TextDecoder().decode(keyIdBytes).replace(/\0/g, '')
    const iv = frameData.slice(KEY_ID_LENGTH, KEY_ID_LENGTH + IV_LENGTH)
    const encryptedData = frameData.slice(KEY_ID_LENGTH + IV_LENGTH)

    const decryptionKey = this.decryptionKeys.get(keyId)
    if (!decryptionKey) {
      if (this.decryptionKeys.size === 0) {
        return
      }

      if (this.currentKeyId && this.decryptionKeys.has(this.currentKeyId)) {
        const fallbackKey = this.decryptionKeys.get(this.currentKeyId)!
        try {
          const decryptedData = await crypto.subtle.decrypt(
            {
              name: this.algorithm,
              iv: iv,
              tagLength: 128,
            },
            fallbackKey.key,
            encryptedData
          )
          frame.data = decryptedData
          return
        } catch (e) {
          return
        }
      }

      return
    }

    try {
      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
          tagLength: 128,
        },
        decryptionKey.key,
        encryptedData
      )

      // Replace frame data with decrypted data
      frame.data = decryptedData
    } catch (error) {
      return
    }
  }

  /**
   * Setup encryption for an RTCRtpSender using Insertable Streams
   */
  async setupEncryptionForSender(sender: RTCRtpSender, keyId?: string): Promise<void> {
    if (!this.isSupported()) {
      return
    }

    // Check if already configured
    if (this.configuredSenders.has(sender)) {
      return
    }

    const senderWithEncodings = sender as RTCRtpSender & {
      createEncodedStreams?: () => { readable: ReadableStream<any>; writable: WritableStream<any> }
    }

    const id = keyId || this.currentKeyId
    if (!id) {
      throw new Error('No encryption key available')
    }

    try {
      // Try the newer transform API first
      if ('transform' in sender) {
        // Check if transform is already set (but not by us)
        if (sender.transform) {
          // Already has a transform, skip
          this.configuredSenders.add(sender)
          return
        }

        const transformer = new TransformStream({
          transform: async (frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame, controller) => {
            try {
              await this.encryptEncodedFrame(frame, id)
              controller.enqueue(frame)
            } catch (error) {
              controller.enqueue(frame)
            }
          },
        })
        sender.transform = transformer
        this.configuredSenders.add(sender)
        return
      }

      // Fallback to createEncodedStreams API
      if (senderWithEncodings.createEncodedStreams) {
        try {
          const streams = senderWithEncodings.createEncodedStreams()
          if (!streams || !streams.readable || !streams.writable) {
            return
          }

          const transformer = new TransformStream({
            transform: async (frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame, controller) => {
              try {
                await this.encryptEncodedFrame(frame, id)
                controller.enqueue(frame)
              } catch (error) {
                controller.enqueue(frame)
              }
            },
          })

          streams.readable.pipeThrough(transformer).pipeTo(streams.writable)
          this.configuredSenders.add(sender)
        } catch (error: any) {
          // If streams already created, that's okay - mark as configured
          if (error.name === 'InvalidStateError' && error.message.includes('already created')) {
            this.configuredSenders.add(sender)
            return
          }
          throw error
        }
      }
    } catch (error) {
      // Silent fail to avoid flooding console
    }
  }

  /**
   * Setup decryption for an RTCRtpReceiver using Insertable Streams
   */
  async setupDecryptionForReceiver(receiver: RTCRtpReceiver): Promise<void> {
    if (!this.isSupported()) {
      return
    }

    // Check if already configured
    if (this.configuredReceivers.has(receiver)) {
      return
    }

    const receiverWithEncodings = receiver as RTCRtpReceiver & {
      createEncodedStreams?: () => { readable: ReadableStream<any>; writable: WritableStream<any> }
    }

    try {
      // Try the newer transform API first
      if ('transform' in receiver) {
        // Check if transform is already set (but not by us)
        if (receiver.transform) {
          // Already has a transform, skip
          this.configuredReceivers.add(receiver)
          return
        }

        const transformer = new TransformStream({
          transform: async (frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame, controller) => {
            try {
              await this.decryptEncodedFrame(frame)
              controller.enqueue(frame)
            } catch (error) {
              controller.enqueue(frame)
            }
          },
        })
        receiver.transform = transformer
        this.configuredReceivers.add(receiver)
        return
      }

      // Fallback to createEncodedStreams API
      if (receiverWithEncodings.createEncodedStreams) {
        try {
          const streams = receiverWithEncodings.createEncodedStreams()
          if (!streams || !streams.readable || !streams.writable) {
            return
          }

          const transformer = new TransformStream({
            transform: async (frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame, controller) => {
              try {
                await this.decryptEncodedFrame(frame)
                controller.enqueue(frame)
              } catch (error) {
                controller.enqueue(frame)
              }
            },
          })

          streams.readable.pipeThrough(transformer).pipeTo(streams.writable)
          this.configuredReceivers.add(receiver)
        } catch (error: any) {
          // If streams already created, that's okay - mark as configured
          if (error.name === 'InvalidStateError' && error.message.includes('already created')) {
            this.configuredReceivers.add(receiver)
            return
          }
          throw error
        }
      }
    } catch (error) {
      // Silent fail to avoid flooding console
    }
  }

  /**
   * Check if a decryption key exists for the given keyId
   */
  hasDecryptionKey(keyId: string): boolean {
    return this.decryptionKeys.has(keyId)
  }

  /**
   * Get the current encryption key ID
   */
  getCurrentKeyId(): string | null {
    return this.currentKeyId
  }

  /**
   * Set the current encryption key ID
   */
  setCurrentKeyId(keyId: string): void {
    if (this.encryptionKeys.has(keyId) || this.decryptionKeys.has(keyId)) {
      this.currentKeyId = keyId
    } else {
      throw new Error(`Key ${keyId} not found`)
    }
  }

  /**
   * Clear all keys (for cleanup)
   */
  clearKeys(): void {
    this.encryptionKeys.clear()
    this.decryptionKeys.clear()
    this.currentKeyId = null
    // Note: WeakSet will automatically clean up when objects are garbage collected
    // But we create new WeakSets to reset the tracking
    this.configuredSenders = new WeakSet()
    this.configuredReceivers = new WeakSet()
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

export const e2eEncryptionService = new E2EEncryptionService()

