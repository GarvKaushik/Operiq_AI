import type { ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { db, type Prisma, type Task } from '@app/shared'
import { unverifiedClaims } from './claims'
import { NeedsConfirmation } from './errors'
import { chat } from './llm'
import { systemPrompt } from './prompt'
import { runTool, type ToolCall } from './runTool'

export const MAX_ITERATIONS = 8
const FOLLOW_UP_MINUTES = 30
const HISTORY_TASKS = 6

/** Saved on the task after every step so retries and confirmations resume where they left off. */
export type AgentState = {
  messages: ChatCompletionMessageParam[]
  iterations: number
  notes: string[]
  /** Tool call ids the user approved. */
  confirmed: string[]
  /** Tool call id waiting for the user's approval. */
  awaiting: string | null
  /** Set once the model was sent back for claiming an action it never performed. */
  claimChecked?: boolean
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
 * First messages for a new task. Recent tasks from the same chat are included as conversation
 * history, so answers spread over several messages ("25 October" ... "5pm" ... "1 hour") add up.
 */
async function initialState(task: Task): Promise<AgentState> {
  const sheets = await db.savedSheet.findMany({
    where: { userId: task.userId },
    select: { name: true, title: true, isDefault: true },
  })
  const agent = await db.agent.findUnique({ where: { userId: task.userId }, select: { name: true, personality: true } })
  const recent = await db.task.findMany({
    where: {
      userId: task.userId,
      chatId: task.chatId,
      status: { in: ['completed', 'failed'] },
      createdAt: { lt: task.createdAt, gte: new Date(task.createdAt.getTime() - FOLLOW_UP_MINUTES * 60_000) },
    },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_TASKS,
  })
  const fileId = task.fileId ?? recent.find((t) => t.fileId)?.fileId ?? null // newest file in the conversation
  const history: ChatCompletionMessageParam[] = [...recent]
    .reverse() // oldest first
    .filter((t) => t.result)
    .flatMap((t) => [
      { role: 'user' as const, content: t.instruction },
      { role: 'assistant' as const, content: t.result! },
    ])
  return {
    messages: [
      { role: 'system', content: systemPrompt({ fileId, sheets, agent }) },
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
    if ('tool_calls' in param) continue

    // The model may claim an action it never performed: send it back once, then warn the user
    const text = message.content || 'Done.'
    const claims = unverifiedClaims(text, calledTools(state.messages))
    if (claims.length && !state.claimChecked) {
      state.claimChecked = true
      state.messages.push({
        role: 'user',
        content:
          `System check: your reply says you ${claims.map((c) => c.what).join(' and ')}, but you never called ` +
          `${claims.map((c) => c.tool).join(' or ')}. If the user asked for it, call the tool now. Otherwise reply honestly that it was not done.`,
      })
      await save()
      continue
    }
    for (const c of claims) state.notes.push(`⚠️ ${c.warning}`)
    return { kind: 'done', text, notes: state.notes }
  }
}

/** Names of every tool the model called in this task. */
function calledTools(messages: ChatCompletionMessageParam[]): Set<string> {
  const names = new Set<string>()
  for (const m of messages) {
    if (m.role === 'assistant') for (const c of (m.tool_calls ?? []) as ToolCall[]) names.add(c.function.name)
  }
  return names
}
