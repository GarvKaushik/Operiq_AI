import { describe, expect, it } from 'vitest'
import { matchChannel } from './slack'

const allowed = [
  { destinationId: 'C123', name: 'sales' },
  { destinationId: 'C456', name: 'Marketing' },
]

describe('slack allowlist matching', () => {
  it('matches by name, #name, case-insensitive, or id', () => {
    expect(matchChannel(allowed, '#sales')?.destinationId).toBe('C123')
    expect(matchChannel(allowed, 'sales')?.destinationId).toBe('C123')
    expect(matchChannel(allowed, '#marketing')?.destinationId).toBe('C456')
    expect(matchChannel(allowed, 'C456')?.name).toBe('Marketing')
  })

  it('refuses channels that are not approved', () => {
    expect(matchChannel(allowed, '#general')).toBeNull()
    expect(matchChannel(allowed, 'sales-team')).toBeNull()
    expect(matchChannel([], '#sales')).toBeNull()
  })
})
