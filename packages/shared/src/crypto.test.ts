import { describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './crypto'

describe('token encryption (AES-256-GCM)', () => {
  it('round-trips and uses a fresh IV each time', () => {
    const a = encrypt('{"access_token":"secret"}')
    expect(decrypt(a)).toBe('{"access_token":"secret"}')
    expect(encrypt('same')).not.toBe(encrypt('same'))
    expect(a).not.toContain('secret')
  })

  it('fails on tampered ciphertext', () => {
    const buf = Buffer.from(encrypt('hello'), 'base64')
    buf[buf.length - 1] ^= 1
    expect(() => decrypt(buf.toString('base64'))).toThrow()
  })
})
