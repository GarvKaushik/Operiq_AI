import { z } from 'zod'
import { saveFile, signedFileUrl } from '@app/shared'
import { summarize } from '../analysis'
import { loadTable } from '../data'
import { renderCard } from '../report/card'
import { renderChart } from '../report/chart'
import { buildPdf } from '../report/pdf'
import { ONE_SOURCE_MESSAGE, hasOneSource, sourceFields } from './source'
import { defineTool } from './types'

export const generateReport = defineTool({
  name: 'generate_report',
  description:
    'Create a summary card image and a PDF report with a chart from an uploaded file or Google Sheet. ' +
    'Both, plus a secure download link, are sent to the user automatically.',
  schema: sourceFields
    .extend({
      title: z.string().min(1).describe('Report title'),
      narrative: z.string().optional().describe('A short explanation of the results, written from analyze_data output'),
    })
    .refine(hasOneSource, ONE_SOURCE_MESSAGE),
  async run(args, ctx) {
    const table = await loadTable(args, ctx.task.userId)
    const summary = summarize(table, { groupBy: args.group_by, valueColumn: args.value_column })
    const chart = await renderChart(summary)
    const owner = { userId: ctx.task.userId, taskId: ctx.task.id, kind: 'report' as const }

    // The card is saved first so it is sent before the PDF
    await saveFile({ ...owner, name: `${args.title}.png`, mimeType: 'image/png', data: await renderCard(args.title, summary, chart) })
    const pdf = await saveFile({
      ...owner,
      name: `${args.title}.pdf`,
      mimeType: 'application/pdf',
      data: await buildPdf(args.title, summary, chart, args.narrative),
    })

    // The link goes to the user via notes; the model never sees it, so it can't repeat it
    ctx.notes.push(`📄 Report: ${signedFileUrl(pdf.id)}`)
    return {
      externalId: pdf.id,
      output: { file_id: pdf.id, status: 'Report created. The card, PDF and link are sent to the user automatically.' },
    }
  },
})
