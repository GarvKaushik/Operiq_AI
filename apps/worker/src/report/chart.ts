import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import type { Summary } from '../analysis'

export const CHART_WIDTH = 920
export const CHART_HEIGHT = 420
const MAX_BARS = 12

const chartCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT, backgroundColour: 'white' })

export function chartTitle(summary: Summary): string {
  return summary.groups ? `${summary.groups.value} by ${summary.groups.by}` : 'Totals by column'
}

/** Bar chart of group totals, or of each number column's total when there are no groups. */
export async function renderChart(summary: Summary): Promise<Buffer> {
  const bars = (
    summary.groups
      ? summary.groups.totals.map((g) => ({ label: g.group, value: g.total }))
      : Object.entries(summary.numericColumns).map(([label, s]) => ({ label, value: s.sum }))
  ).slice(0, MAX_BARS)

  return chartCanvas.renderToBuffer({
    type: 'bar',
    data: {
      labels: bars.map((b) => b.label),
      datasets: [{ data: bars.map((b) => b.value), backgroundColor: '#6366f1', borderRadius: 8, maxBarThickness: 90 }],
    },
    options: {
      locale: 'en-US', // same number format as the tiles and tables
      layout: { padding: 12 },
      plugins: {
        legend: { display: false },
        title: { display: true, text: chartTitle(summary), font: { size: 18, weight: 'bold' }, color: '#111827' },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4b5563', font: { size: 14 } } },
        y: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280', font: { size: 13 } } },
      },
    },
  })
}
