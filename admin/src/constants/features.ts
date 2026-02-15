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
   * Extended version flag - controls access to paid plan features
   * When false, all plans must have $0 price and will show "(free)" label
   */
  EXTENDED_VERSION: import.meta.env.VITE_EXTENDED_VERSION === 'true' || false,
} as const

