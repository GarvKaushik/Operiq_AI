import { beforeEach, describe, expect, it, vi } from 'vitest'

const { chat, runTool, update, findFirst } = vi.hoisted(() => ({
  chat: vi.fn(),
  runTool: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
}))
vi.mock('./llm', () => ({ chat }))
vi.mock('./runTool', () => ({ runTool }))
vi.mock('@app/shared', () => ({
  db: { task: { update, findFirst }, savedSheet: { findMany: async () => [] }, agent: { findUnique: async () => null } },
  env: { TIMEZONE: 'UTC' },
}))

import { NeedsConfirmation } from './errors'
import { pendingToolCalls, runAgent, type AgentState } from './agent'

const toolCall = (id: string, name = 'send_slack_message') => ({
  id,
  type: 'function' as const,
  function: { name, arguments: '{}' },
})
const task = (agentState: AgentState | null = null) =>
  ({ id: 't1', userId: 'u1', chatId: 'c1', instruction: 'post summary', fileId: null, agentState, createdAt: new Date() }) as any

beforeEach(() => {
  chat.mockReset()
  runTool.mockReset()
  update.mockReset()
  findFirst.mockReset().mockResolvedValue(null)
})

describe('pendingToolCalls', () => {
  it('returns unanswered calls with stable step indexes', () => {
    const pending = pendingToolCalls([
      { role: 'user', content: 'x' },
      { role: 'assistant', content: '', tool_calls: [toolCall('a'), toolCall('b')] },
      { role: 'tool', tool_call_id: 'a', content: 'ok' },
      { role: 'tool', tool_call_id: 'b', content: 'ok' },
      { role: 'assistant', content: '', tool_calls: [toolCall('c'), toolCall('d')] },
      { role: 'tool', tool_call_id: 'c', content: 'ok' },
    ])
    expect(pending.map((p) => [p.call.id, p.stepIndex])).toEqual([['d', 3]])
  })
})

describe('runAgent', () => {
  it('runs tools until the model gives a final answer', async () => {
    chat
      .mockResolvedValueOnce({ content: null, tool_calls: [toolCall('a', 'analyze_data')] })
      .mockResolvedValueOnce({ content: 'Revenue is 10.', tool_calls: undefined })
    runTool.mockResolvedValue('{"sum":10}')

    const outcome = await runAgent(task())
    expect(outcome).toEqual({ kind: 'done', text: 'Revenue is 10.', notes: [] })
    expect(runTool).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 0, expect.anything(), false)
  })

  it('pauses for confirmation, then resumes the same call once approved', async () => {
    chat.mockResolvedValueOnce({ content: null, tool_calls: [toolCall('a')] })
    runTool.mockRejectedValueOnce(new NeedsConfirmation('Post to #sales?'))

    expect(await runAgent(task())).toEqual({ kind: 'confirm', question: 'Post to #sales?' })
    const saved: AgentState = update.mock.calls.at(-1)![0].data.agentState
    expect(saved.awaiting).toBe('a')

    // the user approved: the call is confirmed and runs without asking the model again
    chat.mockResolvedValueOnce({ content: 'Posted.', tool_calls: undefined })
    runTool.mockResolvedValueOnce('{"ts":"1"}')
    const approved = { ...structuredClone(saved), confirmed: ['a'], awaiting: null }
    expect(await runAgent(task(approved))).toMatchObject({ kind: 'done', text: 'Posted.' })
    expect(runTool).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }), 0, expect.anything(), true)
    expect(chat).toHaveBeenCalledTimes(2)
  })

  it('a reply to the previous question keeps its context and file', async () => {
    findFirst.mockResolvedValue({ instruction: 'Analyze this file', result: 'Which column?', fileId: 'file1' })
    chat.mockResolvedValueOnce({ content: 'Done.', tool_calls: undefined })

    await runAgent({ ...task(), instruction: 'revenue' })
    const messages = chat.mock.calls[0][0]
    expect(messages[0].content).toContain('file_id "file1"')
    expect(messages.slice(1, 4).map((m: any) => m.content)).toEqual(['Analyze this file', 'Which column?', 'revenue'])
  })

  it('stops after the iteration limit', async () => {
    let n = 0
    chat.mockImplementation(async () => ({ content: null, tool_calls: [toolCall(`c${n++}`, 'list_files')] }))
    runTool.mockResolvedValue('[]')

    const outcome = await runAgent(task())
    expect(outcome.kind).toBe('done')
    expect(chat).toHaveBeenCalledTimes(8)
  })
})
