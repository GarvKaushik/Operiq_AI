import { Queue, type ConnectionOptions } from 'bullmq'
import { env } from './env'

export const TASK_QUEUE = 'tasks'
export type TaskJob = { taskId: string }

export function redisConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  }
}

let queue: Queue<TaskJob> | undefined

export async function enqueueTask(taskId: string) {
  queue ??= new Queue<TaskJob>(TASK_QUEUE, { connection: redisConnection() })
  await queue.add('run', { taskId }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  })
}
