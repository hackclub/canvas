import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// OAuth tokens (Hack Club Auth, Hackatime) are encrypted with AES-256-GCM before they go
// in the database, so a database dump or backup alone can't be used to act as a user.
// Shop order addresses are encrypted the same way (see server/utils/orders.ts).
// Stored as "enc:v1:" + base64(iv, auth tag, ciphertext). Values without the prefix are
// tokens saved before encryption existed; they're still readable and get encrypted the
// next time the user signs in (or links Hackatime again).
const PREFIX = 'enc:v1:'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function useKey() {
  const { tokenKey } = useRuntimeConfig()
  if (!tokenKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set (see .env.example)')
  }
  return createHash('sha256').update(tokenKey).digest()
}

export function encryptToken(token: string) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', useKey(), iv)
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function decryptToken(stored: string) {
  if (!stored.startsWith(PREFIX)) return stored
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64')
  const decipher = createDecipheriv('aes-256-gcm', useKey(), raw.subarray(0, IV_LENGTH))
  decipher.setAuthTag(raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH))
  return Buffer.concat([decipher.update(raw.subarray(IV_LENGTH + TAG_LENGTH)), decipher.final()]).toString('utf8')
}
