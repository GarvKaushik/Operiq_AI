import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

// In-memory step store instead of Postgres
const { steps } = vi.hoisted(() => ({ steps: new Map<string, any>() }))
vi.mock('./steps', () => ({
  findCompletedStep: async (k: any) => {
    const s = steps.get(`${k.taskId}:${k.stepIndex}:${k.tool}`)
    return s?.status === 'completed' ? s : null
  },
  saveStep: async (k: any, update: any) => {
    steps.set(`${k.taskId}:${k.stepIndex}:${k.tool}`, update)
  },
}))
vi.mock('./tools', () => ({ tools: {} }))

import { NeedsConfirmation } from './errors'
import { runTool } from './runTool'
import { defineTool, type ToolContext } from './tools/types'

const run = vi.fn()
const post = defineTool({
  name: 'post',
  description: 'test external action',
  schema: z.object({ channel: z.string(), text: z.string().min(1) }),
  check: async (args) => (args.channel === '#allowed' ? null : `${args.channel} is not approved`),
  confirm: (args) => `Post "${args.text}"?`,
  run,
})
const registry = { post }

const ctx = (): ToolContext => ({ task: { id: 'task1', userId: 'u1' } as any, notes: [] })
const call = (args: object, id = 'call_1') => ({ id, function: { name: 'post', arguments: JSON.stringify(args) } })
const stepFor = (index: number) => steps.get(`task1:${index}:post`)

beforeEach(() => {
  steps.clear()
  run.mockReset().mockResolvedValue({ output: { ts: '123.456' }, externalId: '123.456' })
})

describe('runTool', () => {
  it('returns validation errors to the model and records a failed step', async () => {
    const result = await runTool(call({ channel: '#allowed' }), 0, ctx(), true, registry)
    expect(result).toMatch(/Invalid arguments/)
    expect(stepFor(0).status).toBe('failed')
    expect(run).not.toHaveBeenCalled()
  })

  it('reports unknown tools', async () => {
    const result = await runTool({ id: 'x', function: { name: 'nope', arguments: '{}' } }, 0, ctx(), true, registry)
    expect(result).toMatch(/Unknown tool "nope"/)
  })

  it('refuses destinations that are not allowlisted, records it and tells the user', async () => {
    const c = ctx()
    const result = await runTool(call({ channel: '#random', text: 'hi' }), 0, c, true, registry)
    expect(result).toMatch(/Refused/)
    expect(stepFor(0)).toMatchObject({ status: 'rejected', error: '#random is not approved' })
    expect(c.notes[0]).toMatch(/#random is not approved/)
    expect(run).not.toHaveBeenCalled()
  })

  it('asks for confirmation before an external action', async () => {
    await expect(runTool(call({ channel: '#allowed', text: 'hi' }), 0, ctx(), false, registry)).rejects.toBeInstanceOf(
      NeedsConfirmation,
    )
    expect(stepFor(0).status).toBe('awaiting_confirmation')
    expect(run).not.toHaveBeenCalled()
  })

  it('runs once confirmed and stores the external id', async () => {
    const result = await runTool(call({ channel: '#allowed', text: 'hi' }), 0, ctx(), true, registry)
    expect(JSON.parse(result)).toEqual({ ts: '123.456' })
    expect(stepFor(0)).toMatchObject({ status: 'completed', externalId: '123.456' })
    expect(run.mock.calls[0][1].key).toBe('task1:0:post')
  })

  it('never repeats a completed action on retry (idempotency)', async () => {
    const args = { channel: '#allowed', text: 'hi' }
    await runTool(call(args), 0, ctx(), true, registry)
    const again = await runTool(call(args), 0, ctx(), true, registry)
    expect(run).toHaveBeenCalledTimes(1)
    expect(JSON.parse(again)).toEqual({ ts: '123.456' })

    // a different step index is a different action
    await runTool(call(args, 'call_2'), 1, ctx(), true, registry)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('rethrows transient errors so the job retries', async () => {
    run.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }))
    await expect(runTool(call({ channel: '#allowed', text: 'hi' }), 0, ctx(), true, registry)).rejects.toThrow('rate limited')
    expect(stepFor(0).status).toBe('failed')
  })

  it('returns permanent errors to the model', async () => {
    run.mockRejectedValue(new Error('channel_not_found'))
    const result = await runTool(call({ channel: '#allowed', text: 'hi' }), 0, ctx(), true, registry)
    expect(result).toBe('Error: channel_not_found')
  })
})
