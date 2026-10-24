import { db, type Prisma } from '@app/shared'

export type StepStatus = 'running' | 'completed' | 'failed' | 'rejected' | 'awaiting_confirmation'

type StepUpdate = {
  status: StepStatus
  input?: unknown
  output?: unknown
  error?: string
  externalId?: string
}

type StepKey = { taskId: string; stepIndex: number; tool: string }

/** A completed step with this idempotency key, if the action already happened. */
export function findCompletedStep(key: StepKey) {
  return db.taskStep.findFirst({ where: { ...key, status: 'completed' } })
}

/** Create or update the audit-log row for a tool call. */
export async function saveStep(key: StepKey, update: StepUpdate) {
  const data = {
    status: update.status,
    input: update.input as Prisma.InputJsonValue | undefined,
    output: update.output as Prisma.InputJsonValue | undefined,
    error: update.error,
    externalId: update.externalId,
    finishedAt: ['running', 'awaiting_confirmation'].includes(update.status) ? null : new Date(),
  }
  await db.taskStep.upsert({
    where: { taskId_stepIndex_tool: key },
    create: { ...key, ...data },
    update: data,
  })
}
