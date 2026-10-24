import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: { task: { updateMany: vi.fn(), findUnique: vi.fn() } },
}))
vi.mock('./db', () => ({ db }))

import { approvePendingAction, canTransition, sourcesFor, transition } from './taskState'

beforeEach(() => vi.clearAllMocks())

describe('task state transitions', () => {
  it('allows the documented lifecycle', () => {
    expect(canTransition('queued', 'running')).toBe(true)
    expect(canTransition('running', 'awaiting_confirmation')).toBe(true)
    expect(canTransition('awaiting_confirmation', 'running')).toBe(true)
    expect(canTransition('running', 'completed')).toBe(true)
    expect(canTransition('running', 'failed')).toBe(true)
    expect(canTransition('awaiting_confirmation', 'failed')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransition('queued', 'completed')).toBe(false)
    expect(canTransition('completed', 'running')).toBe(false)
    expect(canTransition('failed', 'running')).toBe(false)
    expect(canTransition('awaiting_confirmation', 'completed')).toBe(false)
  })

  it('updates only when the current status allows it', async () => {
    db.task.updateMany.mockResolvedValue({ count: 1 })
    expect(await transition('t1', 'completed', { result: 'ok' })).toBe(true)
    expect(db.task.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', status: { in: sourcesFor('completed') } },
      data: { result: 'ok', status: 'completed' },
    })
    expect(sourcesFor('completed')).toEqual(['running'])
  })

  it('returns false when another update already moved the task', async () => {
    db.task.updateMany.mockResolvedValue({ count: 0 })
    expect(await transition('t1', 'running')).toBe(false)
  })

  it('approving marks the pending tool call as confirmed', async () => {
    db.task.findUnique.mockResolvedValue({ agentState: { awaiting: 'call_1', confirmed: [] } })
    db.task.updateMany.mockResolvedValue({ count: 1 })
    expect(await approvePendingAction('t1')).toBe(true)
    expect(db.task.updateMany.mock.calls[0][0].data).toMatchObject({
      status: 'running',
      agentState: { awaiting: null, confirmed: ['call_1'] },
    })
  })

  it('approving does nothing when no action is pending', async () => {
    db.task.findUnique.mockResolvedValue({ agentState: { awaiting: null } })
    expect(await approvePendingAction('t1')).toBe(false)
    expect(db.task.updateMany).not.toHaveBeenCalled()
  })
})
