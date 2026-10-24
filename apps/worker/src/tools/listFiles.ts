import { z } from 'zod'
import { db } from '@app/shared'
import { defineTool } from './types'

export const listFiles = defineTool({
  name: 'list_files',
  description: "List the user's uploaded files and generated reports (newest first).",
  schema: z.object({}),
  async run(_args, ctx) {
    const files = await db.file.findMany({
      where: { userId: ctx.task.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, kind: true, createdAt: true },
    })
    return { output: files }
  },
})
