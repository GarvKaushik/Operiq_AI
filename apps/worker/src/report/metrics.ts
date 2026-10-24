import type { Summary } from '../analysis'

export type Tone = 'neutral' | 'good' | 'bad'
export type Metric = { label: string; value: string; note?: string; tone: Tone }

export const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}%`
const toneOf = (n: number): Tone => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral')

/** The column the report is about: revenue if found, else the grouped value, else the first number column. */
export function mainColumn(summary: Summary): string | undefined {
  return summary.profitLoss?.revenueColumn ?? summary.groups?.value ?? Object.keys(summary.numericColumns)[0]
}

/** Up to four headline numbers, shown as tiles on the chat card and in the PDF. */
export function keyMetrics(summary: Summary): Metric[] {
  const metrics: Metric[] = []
  const main = mainColumn(summary)
  const stats = main ? summary.numericColumns[main] : undefined

  if (main && stats) metrics.push({ label: `Total ${main}`, value: fmt(stats.sum), tone: 'neutral' })

  const pl = summary.profitLoss
  if (pl) {
    metrics.push({
      label: pl.result === 'profit' ? 'Profit' : 'Loss',
      value: fmt(Math.abs(pl.profit)),
      note: pl.marginPercent === null ? undefined : `${pl.marginPercent}% margin`,
      tone: pl.profit >= 0 ? 'good' : 'bad',
    })
  }

  if (main && stats?.growthPercent != null) {
    metrics.push({ label: `${main} growth`, value: signed(stats.growthPercent), note: 'first to last row', tone: toneOf(stats.growthPercent) })
  }

  if (summary.groups?.totals[0]) {
    const top = summary.groups.totals[0]
    metrics.push({ label: `Top ${summary.groups.by}`, value: top.group, note: `${top.sharePercent}% of total`, tone: 'neutral' })
  }

  metrics.push({ label: 'Rows', value: fmt(summary.rowCount), tone: 'neutral' })
  return metrics.slice(0, 4)
}
