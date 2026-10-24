import PDFDocument from 'pdfkit'
import type { Summary } from '../analysis'
import { CHART_HEIGHT, CHART_WIDTH } from './chart'
import { fmt, keyMetrics, type Metric, type Tone } from './metrics'

type Doc = PDFKit.PDFDocument

const MARGIN = 50
const INDIGO = '#4f46e5'
const TEXT = '#111827'
const MUTED = '#6b7280'
const ROW_HEIGHT = 22
const TONES: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: '#f3f4f6', text: TEXT },
  good: { bg: '#ecfdf5', text: '#047857' },
  bad: { bg: '#fef2f2', text: '#b91c1c' },
}

const contentWidth = (doc: Doc) => doc.page.width - 2 * MARGIN
const bottom = (doc: Doc) => doc.page.height - MARGIN - 20

/** Start a new page if fewer than `height` points are left. */
function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > bottom(doc)) doc.addPage()
}

function header(doc: Doc, title: string, summary: Summary) {
  doc.rect(0, 0, doc.page.width, 96).fill(INDIGO)
  doc.font('Helvetica-Bold').fontSize(22).fillColor('white').text(title, MARGIN, 30, { width: contentWidth(doc), lineBreak: false, ellipsis: true })
  doc.font('Helvetica').fontSize(10).fillColor('#e0e7ff').text(`${summary.rowCount} rows analysed · ${new Date().toDateString()}`, MARGIN, 62)
  doc.y = 124
}

function heading(doc: Doc, text: string) {
  ensureSpace(doc, 70)
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT).text(text, MARGIN, doc.y)
  doc.moveDown(0.5)
}

function tiles(doc: Doc, metrics: Metric[]) {
  const gap = 10
  const height = 64
  const width = (contentWidth(doc) - gap * (metrics.length - 1)) / metrics.length
  const y = doc.y
  metrics.forEach((m, i) => {
    const x = MARGIN + i * (width + gap)
    doc.roundedRect(x, y, width, height, 8).fill(TONES[m.tone].bg)
    const opts = { width: width - 20, lineBreak: false, ellipsis: true }
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(m.label, x + 10, y + 10, opts)
    doc.font('Helvetica-Bold').fontSize(15).fillColor(TONES[m.tone].text).text(m.value, x + 10, y + 25, opts)
    if (m.note) doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(m.note, x + 10, y + 46, opts)
  })
  doc.y = y + height + 18
}

/** Simple table: bold shaded header, zebra rows, first column left-aligned, numbers right-aligned. */
function table(doc: Doc, headers: string[], rows: string[][], widths: number[]) {
  const total = widths.reduce((a, b) => a + b, 0)
  const scale = contentWidth(doc) / total
  const cols = widths.map((w) => w * scale)

  const drawRow = (cells: string[], y: number, bold: boolean, fill?: string) => {
    if (fill) doc.rect(MARGIN, y, contentWidth(doc), ROW_HEIGHT).fill(fill)
    let x = MARGIN
    cells.forEach((cell, i) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(TEXT)
      doc.text(cell, x + 8, y + 7, { width: cols[i] - 16, height: ROW_HEIGHT, align: i === 0 ? 'left' : 'right', lineBreak: false, ellipsis: true })
      x += cols[i]
    })
  }

  ensureSpace(doc, ROW_HEIGHT * 3)
  let y = doc.y
  drawRow(headers, y, true, '#eef2ff')
  y += ROW_HEIGHT
  rows.forEach((row, i) => {
    if (y + ROW_HEIGHT > bottom(doc)) {
      doc.addPage()
      y = MARGIN
      drawRow(headers, y, true, '#eef2ff')
      y += ROW_HEIGHT
    }
    drawRow(row, y, false, i % 2 ? '#f9fafb' : undefined)
    y += ROW_HEIGHT
  })
  doc.y = y + 18
}

function footers(doc: Doc) {
  const { start, count } = doc.bufferedPageRange()
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0 // writing below the margin must not add a page
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    doc.text(`Business Assistant report · Page ${i + 1} of ${count}`, MARGIN, doc.page.height - 35, { width: contentWidth(doc), align: 'center' })
  }
}

/** A4 report: header, narrative, headline tiles, chart and tables. All numbers come from `summary`. */
export function buildPdf(title: string, summary: Summary, chart: Buffer, narrative?: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  header(doc, title, summary)
  if (narrative) {
    doc.font('Helvetica').fontSize(11).fillColor(TEXT).text(narrative, MARGIN, doc.y, { width: contentWidth(doc), lineGap: 3 })
    doc.moveDown(1.2)
  }
  tiles(doc, keyMetrics(summary))

  const chartHeight = (contentWidth(doc) * CHART_HEIGHT) / CHART_WIDTH
  ensureSpace(doc, chartHeight + 10)
  doc.image(chart, MARGIN, doc.y, { width: contentWidth(doc) })
  doc.y += chartHeight + 20

  heading(doc, 'Key figures')
  table(
    doc,
    ['Column', 'Total', 'Average', 'Min', 'Max', 'Growth'],
    Object.entries(summary.numericColumns).map(([column, s]) => [
      column, fmt(s.sum), fmt(s.mean), fmt(s.min), fmt(s.max), s.growthPercent === null ? '-' : `${s.growthPercent}%`,
    ]),
    [2, 1.3, 1.3, 1.1, 1.1, 1],
  )

  const pl = summary.profitLoss
  if (pl) {
    heading(doc, 'Profit / loss')
    table(
      doc,
      ['', 'Amount'],
      [
        [pl.revenueColumn, fmt(pl.revenue)],
        [pl.costColumn, fmt(pl.cost)],
        [pl.result === 'profit' ? 'Profit' : 'Loss', fmt(Math.abs(pl.profit))],
        ['Margin', pl.marginPercent === null ? '-' : `${pl.marginPercent}%`],
      ],
      [3, 2],
    )
  }

  const groups = summary.groups
  if (groups) {
    heading(doc, `${groups.value} by ${groups.by}`)
    table(doc, [groups.by ?? 'Group', groups.value ?? 'Total', 'Share'], groups.totals.map((g) => [g.group, fmt(g.total), `${g.sharePercent}%`]), [3, 2, 1])
    if (groups.groupCount > groups.totals.length) {
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`Showing top ${groups.totals.length} of ${groups.groupCount} groups.`, MARGIN, doc.y - 10)
    }
  }

  footers(doc)
  doc.end()
  return done
}
