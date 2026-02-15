export const generateE2EPublicKey = (): string => {
  // Generate a random 32-byte string for use as a public key/seed
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
