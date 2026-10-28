import { describe, expect, it } from 'vitest'
import { matchChannel, slackIdentity } from './slack'

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

describe('slack identity (who a post is for)', () => {
  it('shows the agent name, the requester and the avatar emoji', () => {
    expect(slackIdentity({ name: 'John', avatar: 'businessman' }, 'Garv Kaushik')).toEqual({
      username: 'John · for Garv',
      icon_emoji: ':male-office-worker:',
    })
  })

  it('falls back when the user has no name, no agent or an unknown avatar', () => {
    expect(slackIdentity({ name: 'John', avatar: 'robot' }, null)).toEqual({ username: 'John', icon_emoji: ':robot_face:' })
    expect(slackIdentity(null, 'Garv')).toEqual({ username: 'Assistant · for Garv', icon_emoji: ':robot_face:' })
    expect(slackIdentity({ name: 'Max', avatar: 'unknown' }, '  ').icon_emoji).toBe(':robot_face:')
  })
})
