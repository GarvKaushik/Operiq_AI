import { createCanvas, loadImage, type CanvasRenderingContext2D } from 'canvas'
import type { Summary } from '../analysis'
import { CHART_HEIGHT, CHART_WIDTH } from './chart'
import { keyMetrics, type Tone } from './metrics'

const WIDTH = 1000
const PAD = 40
const GAP = 16
const TILE_HEIGHT = 110
const CHART_TOP = 250

const TONES: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: '#f3f4f6', text: '#111827' },
  good: { bg: '#ecfdf5', text: '#047857' },
  bad: { bg: '#fef2f2', text: '#b91c1c' },
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Shrink text with "…" until it fits in `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t}…`
}

/** PNG summary card for the chat: title, headline numbers and the chart. */
export async function renderCard(title: string, summary: Summary, chart: Buffer): Promise<Buffer> {
  const height = CHART_TOP + CHART_HEIGHT + 70
  const canvas = createCanvas(WIDTH, height)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, height)
  ctx.fillStyle = '#4f46e5'
  ctx.fillRect(0, 0, WIDTH, 8)

  ctx.fillStyle = '#111827'
  ctx.font = 'bold 34px sans-serif'
  ctx.fillText(fit(ctx, title, WIDTH - 2 * PAD), PAD, 66)
  ctx.fillStyle = '#6b7280'
  ctx.font = '18px sans-serif'
  ctx.fillText(`${summary.rowCount} rows · ${new Date().toDateString()}`, PAD, 98)

  const metrics = keyMetrics(summary)
  const tileWidth = (WIDTH - 2 * PAD - GAP * (metrics.length - 1)) / metrics.length
  metrics.forEach((m, i) => {
    const x = PAD + i * (tileWidth + GAP)
    const y = 122
    roundRect(ctx, x, y, tileWidth, TILE_HEIGHT, 14)
    ctx.fillStyle = TONES[m.tone].bg
    ctx.fill()
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px sans-serif'
    ctx.fillText(fit(ctx, m.label, tileWidth - 32), x + 16, y + 30)
    ctx.fillStyle = TONES[m.tone].text
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(fit(ctx, m.value, tileWidth - 32), x + 16, y + 68)
    if (m.note) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px sans-serif'
      ctx.fillText(fit(ctx, m.note, tileWidth - 32), x + 16, y + 94)
    }
  })

  ctx.drawImage(await loadImage(chart), (WIDTH - CHART_WIDTH) / 2, CHART_TOP)

  ctx.fillStyle = '#9ca3af'
  ctx.font = '15px sans-serif'
  ctx.fillText('Full PDF report attached below', PAD, height - 28)

  return canvas.toBuffer('image/png')
}
