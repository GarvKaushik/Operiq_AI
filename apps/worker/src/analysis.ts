// All calculations happen here, in code. The model only receives these summaries.

export type Cell = string | number | null
export type Table = { columns: string[]; rows: Record<string, Cell>[] }

const SAMPLE_ROWS = 5
const MAX_GROUPS = 20
const round = (n: number) => Math.round(n * 100) / 100

/** Build a table from raw rows where the first row is the header. */
export function rowsToTable(raw: unknown[][]): Table {
  const [header = [], ...data] = raw
  const columns = header.map((h, i) => String(h ?? '').trim() || `column_${i + 1}`)
  const rows = data
    .filter((r) => r.some((v) => v !== null && v !== undefined && v !== ''))
    .map((r) => Object.fromEntries(columns.map((c, i) => [c, normalize(r[i])])))
  return { columns, rows }
}

function normalize(v: unknown): Cell {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/** Parse "1,234.50", "$99", "12%" etc. Returns null for non-numbers. */
export function toNumber(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const cleaned = v.replace(/[,\s$€£₹%]/g, '')
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

/** Columns where at least 80% of non-empty values are numeric. */
export function numericColumns(table: Table): string[] {
  return table.columns.filter((c) => {
    const values = table.rows.map((r) => r[c]).filter((v) => v !== null)
    return values.length > 0 && values.filter((v) => toNumber(v) !== null).length / values.length >= 0.8
  })
}

const numbersIn = (table: Table, column: string) =>
  table.rows.map((r) => toNumber(r[column])).filter((n): n is number => n !== null)

export function columnStats(values: number[]) {
  if (!values.length) return { count: 0, sum: 0, mean: 0, min: 0, max: 0 }
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    count: values.length,
    sum: round(sum),
    mean: round(sum / values.length),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  }
}

/** Percent change from first to last value, in row order. */
export function growthPercent(values: number[]): number | null {
  if (values.length < 2 || values[0] === 0) return null
  return round(((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100)
}

/** Sum of `valueColumn` per distinct value of `groupBy` and its share of the whole, largest first. */
export function groupTotals(table: Table, groupBy: string, valueColumn: string) {
  const totals = new Map<string, number>()
  for (const row of table.rows) {
    const value = toNumber(row[valueColumn])
    if (value === null) continue
    const key = String(row[groupBy] ?? '(blank)')
    totals.set(key, (totals.get(key) ?? 0) + value)
  }
  const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals]
    .map(([group, total]) => ({
      group,
      total: round(total),
      sharePercent: grandTotal ? round((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

const REVENUE = /revenue|sales|income|amount/i
const COST = /cost|expense|spend/i

/** Revenue minus cost, when the table has columns that look like both. */
export function profitLoss(table: Table) {
  const numeric = numericColumns(table)
  const revenueColumn = numeric.find((c) => REVENUE.test(c) && !COST.test(c))
  const costColumn = numeric.find((c) => COST.test(c))
  if (!revenueColumn || !costColumn) return null
  const revenue = columnStats(numbersIn(table, revenueColumn)).sum
  const cost = columnStats(numbersIn(table, costColumn)).sum
  const profit = round(revenue - cost)
  return {
    revenueColumn,
    costColumn,
    revenue,
    cost,
    profit,
    result: profit >= 0 ? 'profit' : 'loss',
    marginPercent: revenue ? round((profit / revenue) * 100) : null,
  }
}

export type SummaryOptions = { groupBy?: string; valueColumn?: string }

/** Compact summary of a table: safe to send to the model. */
export function summarize(table: Table, { groupBy, valueColumn }: SummaryOptions = {}) {
  const numeric = numericColumns(table)
  for (const c of [groupBy, valueColumn]) {
    if (c && !table.columns.includes(c)) throw new Error(`Unknown column "${c}". Columns: ${table.columns.join(', ')}`)
  }
  const value = valueColumn ?? numeric[0]
  const groups = groupBy && value ? groupTotals(table, groupBy, value) : undefined

  return {
    rowCount: table.rows.length,
    columns: table.columns,
    numericColumns: Object.fromEntries(
      numeric.map((c) => {
        const values = numbersIn(table, c)
        return [c, { ...columnStats(values), growthPercent: growthPercent(values) }]
      }),
    ),
    profitLoss: profitLoss(table),
    groups: groups && { by: groupBy, value, totals: groups.slice(0, MAX_GROUPS), groupCount: groups.length },
    sampleRows: table.rows.slice(0, SAMPLE_ROWS),
  }
}

export type Summary = ReturnType<typeof summarize>
