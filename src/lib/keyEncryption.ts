// RSA-OAEP public-key encryption for API keys.
// The private key lives only in Netlify's environment variables — never in the bundle.
// Keys are encrypted per-request in the browser; the ciphertext is meaningless without
// the private key, so intercepting network traffic yields nothing usable.

const PUBLIC_KEY_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo3M1i2+pl9hAX3WLaJ/j' +
  'YBi/iLu58d/xPm860ZNgK+abBFsMbwMX6E63wtd5gu7h6yTTtOWBuJOK497DBqrT' +
  'LQPTZvwR9vnCntV+Zn+CN3SsJ+YNyPrW2w2qX6tHzJXdt43EHA3TQ3AOwQ24BdKM' +
  'xC0AOqhzqAa+dlKxi6zV3/bygR8KGSlksIaXminIkRgC4kSQsxG/1IF2em2wwNxb' +
  '+lV9hF/pUurtmotU8A0KZZAbkK2l7retX6bOMA/bsTKHk1nev04zgYeuSB6q1p6Q' +
  'QPBzVQj7m+KJw6/lULCBimYvABHqH/RqtigtgDSwej0ryVlhYlw7h0O4gZgdSt7f' +
  'xwIDAQAB'

let cachedKey: CryptoKey | null = null

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const b64 = PUBLIC_KEY_B64.replace(/\s/g, '')
  const binary = atob(b64)
  const der = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i)

  cachedKey = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  return cachedKey
}

async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const key = await getPublicKey()
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

export interface RawKeys {
  anthropicKey: string
  geminiKey: string
  openaiKey: string
}

export interface EncryptedKeys {
  anthropicKey: string
  geminiKey: string
  openaiKey: string
  keysEncrypted: true
}

export async function encryptKeys(raw: RawKeys): Promise<EncryptedKeys> {
  const [anthropicKey, geminiKey, openaiKey] = await Promise.all([
    encryptApiKey(raw.anthropicKey),
    encryptApiKey(raw.geminiKey),
    encryptApiKey(raw.openaiKey),
  ])
  return { anthropicKey, geminiKey, openaiKey, keysEncrypted: true }
}
