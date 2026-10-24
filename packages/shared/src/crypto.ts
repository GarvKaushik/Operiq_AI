import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { required } from './env'

function key(): Buffer {
  const buf = Buffer.from(required('ENCRYPTION_KEY'), 'base64')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64 encoded')
  return buf
}

/** AES-256-GCM. Output: base64(iv | authTag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}

/** HMAC-SHA256 signature, base64url. */
export function sign(value: string): string {
  return createHmac('sha256', required('SIGNING_SECRET')).update(value).digest('base64url')
}

export function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}
