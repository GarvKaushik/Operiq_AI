import { z } from 'zod'
import { summarize } from '../analysis'
import { loadTable } from '../data'
import { sheetField } from './source'
import { defineTool } from './types'

export const readSheet = defineTool({
  name: 'read_sheet',
  description: 'Read a Google Sheet and return a compact summary: columns, row count, numeric totals and sample rows.',
  schema: z.object({
    sheet: sheetField,
    range: z.string().optional().describe('A1 range like "Sheet1!A1:F500". Default A1:Z1000'),
  }),
  async run(args, ctx) {
    const table = await loadTable(args, ctx.task.userId)
    return { output: summarize(table) }
  },
})
