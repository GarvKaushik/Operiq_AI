import { describe, expect, it } from 'vitest'
import { createOAuthState, signedFileUrl, verifyFileSignature, verifyOAuthState } from './signedUrl'

function parse(url: string) {
  const u = new URL(url)
  return { id: u.pathname.split('/').pop()!, exp: u.searchParams.get('exp')!, sig: u.searchParams.get('sig')! }
}

describe('signed download URLs', () => {
  it('accepts a valid link', () => {
    const { id, exp, sig } = parse(signedFileUrl('file123'))
    expect(id).toBe('file123')
    expect(verifyFileSignature(id, exp, sig)).toBe(true)
  })

  it('rejects an expired link', () => {
    const { id, exp, sig } = parse(signedFileUrl('file123', 1))
    expect(verifyFileSignature(id, exp, sig, Date.now() + 2 * 3600_000)).toBe(false)
  })

  it('rejects a tampered file id, expiry or signature', () => {
    const { id, exp, sig } = parse(signedFileUrl('file123'))
    expect(verifyFileSignature('file999', exp, sig)).toBe(false)
    expect(verifyFileSignature(id, String(Number(exp) + 3600), sig)).toBe(false)
    expect(verifyFileSignature(id, exp, sig.slice(0, -2) + 'xx')).toBe(false)
    expect(verifyFileSignature(id, exp, '')).toBe(false)
    expect(verifyFileSignature(id, 'abc', sig)).toBe(false)
  })

  it('defaults to a 24 hour expiry', () => {
    const now = Date.now()
    const { exp } = parse(signedFileUrl('f', undefined, now))
    expect(Number(exp)).toBe(Math.floor(now / 1000) + 24 * 3600)
  })
})

describe('OAuth state', () => {
  it('accepts the state for the user who started the flow', () => {
    expect(verifyOAuthState(createOAuthState('user1'), 'user1')).toBe(true)
  })

  it('rejects a state created for another user (account injection)', () => {
    // attacker starts "Connect Google" and sends the link to a logged-in victim
    expect(verifyOAuthState(createOAuthState('attacker'), 'victim')).toBe(false)
  })

  it('rejects tampered, expired or malformed states', () => {
    const state = createOAuthState('user1')
    expect(verifyOAuthState(state.replace('user1', 'user2'), 'user2')).toBe(false)
    const [userId, , sig] = state.split('.')
    expect(verifyOAuthState(`${userId}.1000.${sig}`, 'user1')).toBe(false)
    expect(verifyOAuthState('garbage', 'user1')).toBe(false)
    expect(verifyOAuthState('', 'user1')).toBe(false)
  })
})
