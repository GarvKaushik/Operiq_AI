import { readFile } from 'node:fs/promises'
import { UnrecoverableError, type Job } from 'bullmq'
import { db, getMessaging, transition, type TaskJob } from '@app/shared'
import { runAgent } from './agent'
import { errorMessage, isTransient } from './errors'

/** BullMQ job: run the agent for one task and reply on the task's channel. */
export async function processTask(job: Job<TaskJob>) {
  const task = await db.task.findUnique({ where: { id: job.data.taskId } })
  if (!task) return
  if (task.status === 'queued') await transition(task.id, 'running')
  else if (task.status !== 'running') return // finished, or waiting for the user

  const messaging = getMessaging(task.channel)
  try {
    const outcome = await runAgent(task)

    if (outcome.kind === 'confirm') {
      await transition(task.id, 'awaiting_confirmation')
      await messaging.sendConfirmation(task.chatId, outcome.question, task.id)
      return
    }

    const reply = [outcome.text, ...outcome.notes].join('\n\n')
    await transition(task.id, 'completed', { result: reply })
    await messaging.sendText(task.chatId, reply)

    // Also send generated reports as files in the chat
    const reports = await db.file.findMany({ where: { taskId: task.id, kind: 'report' }, orderBy: { createdAt: 'asc' } })
    for (const file of reports) {
      await messaging.sendFile(task.chatId, { name: file.name, data: await readFile(file.path) })
    }
  } catch (err) {
    const willRetry = isTransient(err) && job.attemptsMade + 1 < (job.opts.attempts ?? 1)
    if (willRetry) throw err

    await transition(task.id, 'failed', { error: errorMessage(err) })
    await messaging.sendText(task.chatId, `❌ Sorry, the task failed: ${errorMessage(err)}`).catch(() => {})
    throw new UnrecoverableError(errorMessage(err))
  }
}
