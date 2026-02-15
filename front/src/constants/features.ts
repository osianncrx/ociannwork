/**
 * Feature Flags Configuration
 * 
 * This file controls which features are available based on the license version.
 * Set VITE_EXTENDED_VERSION=true in your .env file to enable extended features.
 * 
 * For free version: VITE_EXTENDED_VERSION=false or not set
 * For extended version: VITE_EXTENDED_VERSION=true
 */

export const FEATURES = {
  /**
   * Extended version flag - controls access to wallet module
   * When false, wallet UI is shown but functionality is disabled
   */
  EXTENDED_VERSION: import.meta.env.VITE_EXTENDED_VERSION === 'true' || false,
  
  /**
   * Check if wallet module is available
   */
  WALLET_ENABLED: import.meta.env.VITE_EXTENDED_VERSION === 'true' || false,
} as const

