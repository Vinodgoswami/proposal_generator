import { privateDecrypt, constants } from 'crypto'

// Decrypt a single RSA-OAEP base64-encoded ciphertext using the private key
// stored in the RSA_PRIVATE_KEY environment variable.
// Falls back to the plaintext value when the env var is absent (local dev).
function decryptApiKey(value: string): string {
  if (!value) return ''

  const pem = process.env.RSA_PRIVATE_KEY
  if (!pem) {
    // Local dev — keys arrive as plaintext
    return value
  }

  try {
    const buf = Buffer.from(value, 'base64')
    const decrypted = privateDecrypt(
      { key: pem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      buf,
    )
    return decrypted.toString('utf8')
  } catch {
    // If decryption fails (e.g. already plaintext in testing), return as-is
    return value
  }
}

export interface KeyFields {
  anthropicKey?: string
  geminiKey?: string
  openaiKey?: string
  keysEncrypted?: boolean
}

// Decrypts the three key fields in-place when keysEncrypted is true.
// Returns a new object with plaintext keys.
export function decryptKeys<T extends KeyFields>(body: T): T {
  if (!body.keysEncrypted) return body

  return {
    ...body,
    anthropicKey: decryptApiKey(body.anthropicKey ?? ''),
    geminiKey: decryptApiKey(body.geminiKey ?? ''),
    openaiKey: decryptApiKey(body.openaiKey ?? ''),
    keysEncrypted: false,
  }
}
