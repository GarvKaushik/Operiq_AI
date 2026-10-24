import { beforeEach, describe, expect, it, vi } from 'vitest'

const { chat, runTool, update, findMany } = vi.hoisted(() => ({
  chat: vi.fn(),
  runTool: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
}))
vi.mock('./llm', () => ({ chat }))
vi.mock('./runTool', () => ({ runTool }))
vi.mock('@app/shared', () => ({
  db: { task: { update, findMany }, savedSheet: { findMany: async () => [] }, agent: { findUnique: async () => null } },
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
  findMany.mockReset().mockResolvedValue([])
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
    findMany.mockResolvedValue([{ instruction: 'Analyze this file', result: 'Which column?', fileId: 'file1' }])
    chat.mockResolvedValueOnce({ content: 'Done.', tool_calls: undefined })

    await runAgent({ ...task(), instruction: 'revenue' })
    const messages = chat.mock.calls[0][0]
    expect(messages[0].content).toContain('file_id "file1"')
    expect(messages.slice(1, 4).map((m: any) => m.content)).toEqual(['Analyze this file', 'Which column?', 'revenue'])
  })

  it('keeps details spread over several messages, oldest first', async () => {
    // findMany returns newest first, as the query orders by createdAt desc
    findMany.mockResolvedValue([
      { instruction: '6pm', result: 'Got it, a title?', fileId: null },
      { instruction: '25 October 5pm', result: 'Until when?', fileId: null },
      { instruction: 'schedule a meeting with a@x.com', result: 'Which date and time?', fileId: null },
    ])
    chat.mockResolvedValueOnce({ content: 'Done.', tool_calls: undefined })

    await runAgent({ ...task(), instruction: 'Meeting with Garv' })
    const contents = chat.mock.calls[0][0].slice(1, 8).map((m: any) => m.content)
    expect(contents).toEqual([
      'schedule a meeting with a@x.com', 'Which date and time?',
      '25 October 5pm', 'Until when?',
      '6pm', 'Got it, a title?',
      'Meeting with Garv',
    ])
  })

  it('sends the model back when it claims a Slack post it never made', async () => {
    chat
      .mockResolvedValueOnce({ content: 'Posted the report to #sales on Slack!', tool_calls: undefined })
      .mockResolvedValueOnce({ content: null, tool_calls: [toolCall('s1')] })
      .mockResolvedValueOnce({ content: 'Posted to #sales.', tool_calls: undefined })
    runTool.mockResolvedValue('{"ts":"1"}')

    const outcome = await runAgent(task())
    const nudge = chat.mock.calls[1][0].find((m: any) => m.role === 'user' && m.content.startsWith('System check'))
    expect(nudge.content).toMatch(/never called send_slack_message/)
    expect(runTool).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 0, expect.anything(), false)
    expect(outcome).toMatchObject({ kind: 'done', text: 'Posted to #sales.', notes: [] })
  })

  it('warns the user if the model still claims it after the check', async () => {
    chat.mockResolvedValue({ content: 'Posted the report to #sales on Slack!', tool_calls: undefined })
    const outcome = await runAgent(task())
    expect(chat).toHaveBeenCalledTimes(2)
    expect(outcome).toMatchObject({ kind: 'done', notes: ['⚠️ Nothing was posted to Slack in this task.'] })
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
