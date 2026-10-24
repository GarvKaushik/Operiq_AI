import type { Prisma, TaskStatus } from '@prisma/client'
import { db } from './db'

const transitions: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'failed'],
  running: ['awaiting_confirmation', 'completed', 'failed'],
  awaiting_confirmation: ['running', 'failed'],
  completed: [],
  failed: [],
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return transitions[from].includes(to)
}

/** Statuses a task may be in to move to `to`. */
export function sourcesFor(to: TaskStatus): TaskStatus[] {
  return (Object.keys(transitions) as TaskStatus[]).filter((from) => canTransition(from, to))
}

/**
 * Atomically move a task to `to`. Only succeeds if the current status allows it,
 * so concurrent updates (e.g. a double-tapped button) can't both win.
 */
export async function transition(taskId: string, to: TaskStatus, data: Prisma.TaskUpdateManyMutationInput = {}) {
  const { count } = await db.task.updateMany({
    where: { id: taskId, status: { in: sourcesFor(to) } },
    data: { ...data, status: to },
  })
  return count === 1
}

/** The user approved the pending action: mark it confirmed and set the task running again. */
export async function approvePendingAction(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } })
  const state = task?.agentState as { awaiting?: string | null; confirmed?: string[] } | null
  if (!state?.awaiting) return false
  const agentState = { ...state, confirmed: [...(state.confirmed ?? []), state.awaiting], awaiting: null }
  return transition(taskId, 'running', { agentState })
}
