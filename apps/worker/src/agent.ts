import type { ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { db, type Prisma, type Task } from '@app/shared'
import { NeedsConfirmation } from './errors'
import { chat } from './llm'
import { systemPrompt } from './prompt'
import { runTool, type ToolCall } from './runTool'

export const MAX_ITERATIONS = 8
const FOLLOW_UP_MINUTES = 15

/** Saved on the task after every step so retries and confirmations resume where they left off. */
export type AgentState = {
  messages: ChatCompletionMessageParam[]
  iterations: number
  notes: string[]
  /** Tool call ids the user approved. */
  confirmed: string[]
  /** Tool call id waiting for the user's approval. */
  awaiting: string | null
}

export type AgentOutcome =
  | { kind: 'done'; text: string; notes: string[] }
  | { kind: 'confirm'; question: string }

/** Tool calls of the last assistant message that have no result yet, with their stable step index. */
export function pendingToolCalls(messages: ChatCompletionMessageParam[]) {
  let stepIndex = 0
  let pending: { call: ToolCall; stepIndex: number }[] = []
  for (const m of messages) {
    if (m.role === 'assistant' && m.tool_calls?.length) {
      pending = (m.tool_calls as ToolCall[]).map((call) => ({ call, stepIndex: stepIndex++ }))
    } else if (m.role === 'tool') {
      pending = pending.filter((p) => p.call.id !== m.tool_call_id)
    }
  }
  return pending
}

function toAssistantParam(message: ChatCompletionMessage, iteration: number): ChatCompletionMessageParam {
  const toolCalls = (message.tool_calls ?? [])
    .filter((c) => c.type === 'function')
    .map((c, i) => ({ ...c, id: c.id || `call_${iteration}_${i}` })) // some backends omit ids
  return { role: 'assistant', content: message.content ?? '', ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }
}

/**
 * First messages for a new task. A task finished in the same chat in the last few minutes
 * is included, so a reply to the agent's question keeps its context (and its file).
 */
async function initialState(task: Task): Promise<AgentState> {
  const sheets = await db.savedSheet.findMany({
    where: { userId: task.userId },
    select: { name: true, title: true, isDefault: true },
  })
  const previous = await db.task.findFirst({
    where: {
      userId: task.userId,
      chatId: task.chatId,
      status: { in: ['completed', 'failed'] },
      createdAt: { lt: task.createdAt, gte: new Date(task.createdAt.getTime() - FOLLOW_UP_MINUTES * 60_000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  const history: ChatCompletionMessageParam[] = previous?.result
    ? [
        { role: 'user', content: previous.instruction },
        { role: 'assistant', content: previous.result },
      ]
    : []
  return {
    messages: [
      { role: 'system', content: systemPrompt(task.fileId ?? previous?.fileId ?? null, sheets) },
      ...history,
      { role: 'user', content: task.instruction },
    ],
    iterations: 0,
    notes: [],
    confirmed: [],
    awaiting: null,
  }
}

export async function runAgent(task: Task): Promise<AgentOutcome> {
  const state: AgentState = (task.agentState as AgentState | null) ?? (await initialState(task))
  const save = () =>
    db.task.update({ where: { id: task.id }, data: { agentState: state as unknown as Prisma.InputJsonValue } })
  const ctx = { task, notes: state.notes }

  while (true) {
    const pending = pendingToolCalls(state.messages)
    if (pending.length) {
      for (const { call, stepIndex } of pending) {
        let content: string
        try {
          content = await runTool(call, stepIndex, ctx, state.confirmed.includes(call.id))
        } catch (err) {
          if (!(err instanceof NeedsConfirmation)) throw err
          state.awaiting = call.id
          await save()
          return { kind: 'confirm', question: err.question }
        }
        state.messages.push({ role: 'tool', tool_call_id: call.id, content })
        await save()
      }
      continue
    }

    if (state.iterations >= MAX_ITERATIONS) {
      return { kind: 'done', text: `I stopped after ${MAX_ITERATIONS} steps without finishing. Try a more specific instruction.`, notes: state.notes }
    }
    const message = await chat(state.messages)
    state.iterations++
    const param = toAssistantParam(message, state.iterations)
    state.messages.push(param)
    await save()
    if (!('tool_calls' in param)) return { kind: 'done', text: message.content || 'Done.', notes: state.notes }
  }
}
