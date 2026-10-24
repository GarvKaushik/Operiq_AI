import { Worker } from 'bullmq'
import { TASK_QUEUE, redisConnection, type TaskJob } from '@app/shared'
import { processTask } from './processTask'

const worker = new Worker<TaskJob>(TASK_QUEUE, processTask, { connection: redisConnection(), concurrency: 2 })

worker.on('ready', () => console.log('worker ready'))
worker.on('failed', (job, err) => console.error(`job ${job?.id} (task ${job?.data.taskId}) failed: ${err.message}`))

process.on('SIGTERM', () => worker.close())
process.on('SIGINT', () => worker.close())
