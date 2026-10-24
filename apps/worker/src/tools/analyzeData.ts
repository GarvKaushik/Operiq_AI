import { summarize } from '../analysis'
import { loadTable } from '../data'
import { sourceSchema } from './source'
import { defineTool } from './types'

export const analyzeData = defineTool({
  name: 'analyze_data',
  description:
    'Compute statistics for an uploaded file or Google Sheet: totals, averages, min/max, growth, profit/loss, ' +
    'and optional totals per group. All numbers are computed exactly; use them instead of calculating yourself.',
  schema: sourceSchema,
  async run(args, ctx) {
    const table = await loadTable(args, ctx.task.userId)
    return { output: summarize(table, { groupBy: args.group_by, valueColumn: args.value_column }) }
  },
})
