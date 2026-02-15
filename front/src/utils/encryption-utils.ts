import { userKeyManagerService } from '../services/user-key-manager.service'

/**
 * Initialize E2E encryption keys for user
 * Generates RSA key pair, stores private key locally, and sends public key to server
 */
export const initializeUserEncryptionKeysWithApi = async (): Promise<boolean> => {
  try {
    // Check if user already has keys
    if (userKeyManagerService.hasKeyPair()) {
      return true
    }

    // Generate new key pair
    const keyPair = await userKeyManagerService.generateKeyPair()

    // Store the key pair locally
    userKeyManagerService.storeKeyPair(keyPair)

    // Import the post function directly
    const { post } = await import('../api')
    const { URL_KEYS } = await import('../constants')

    // Send public key to backend
    try {
      await post(URL_KEYS.E2E.SaveKey, { public_key: keyPair.publicKey })
      return true
    } catch (apiError: any) {
      // Continue even if API fails - keys are stored locally
      return true
    }
  } catch (error) {
    return false
  }
}


