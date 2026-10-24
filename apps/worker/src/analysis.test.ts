import { describe, expect, it } from 'vitest'
import { groupTotals, growthPercent, profitLoss, rowsToTable, summarize, toNumber } from './analysis'

const sales = rowsToTable([
  ['Month', 'Region', 'Revenue', 'Cost'],
  ['Jan', 'North', '1,000', 600],
  ['Feb', 'South', 1500, '700'],
  ['Mar', 'North', '$2,000.50', 900],
  [null, null, null, null], // blank row is dropped
])

describe('data analysis', () => {
  it('parses numbers written with separators and symbols', () => {
    expect(toNumber('1,234.5')).toBe(1234.5)
    expect(toNumber('$99')).toBe(99)
    expect(toNumber('12%')).toBe(12)
    expect(toNumber('abc')).toBeNull()
    expect(toNumber(null)).toBeNull()
  })

  it('builds a table and drops empty rows', () => {
    expect(sales.columns).toEqual(['Month', 'Region', 'Revenue', 'Cost'])
    expect(sales.rows).toHaveLength(3)
  })

  it('computes totals, averages, min, max and growth per numeric column', () => {
    const summary = summarize(sales)
    expect(Object.keys(summary.numericColumns)).toEqual(['Revenue', 'Cost'])
    expect(summary.numericColumns.Revenue).toEqual({
      count: 3, sum: 4500.5, mean: 1500.17, min: 1000, max: 2000.5, growthPercent: 100.05,
    })
    expect(summary.numericColumns.Cost.sum).toBe(2200)
    expect(summary.rowCount).toBe(3)
  })

  it('computes profit and margin', () => {
    expect(profitLoss(sales)).toMatchObject({ revenue: 4500.5, cost: 2200, profit: 2300.5, result: 'profit', marginPercent: 51.12 })
  })

  it('reports a loss when cost exceeds revenue', () => {
    const t = rowsToTable([['Sales', 'Expenses'], [100, 250]])
    expect(profitLoss(t)).toMatchObject({ profit: -150, result: 'loss' })
  })

  it('totals by group with share of the whole, largest first', () => {
    expect(groupTotals(sales, 'Region', 'Revenue')).toEqual([
      { group: 'North', total: 3000.5, sharePercent: 66.67 },
      { group: 'South', total: 1500, sharePercent: 33.33 },
    ])
  })

  it('handles growth edge cases', () => {
    expect(growthPercent([5])).toBeNull()
    expect(growthPercent([0, 10])).toBeNull()
    expect(growthPercent([200, 150])).toBe(-25)
  })

  it('rejects unknown columns with a helpful message', () => {
    expect(() => summarize(sales, { groupBy: 'Country' })).toThrow(/Unknown column "Country"/)
  })

  it('keeps only a few sample rows', () => {
    const big = rowsToTable([['n'], ...Array.from({ length: 100 }, (_, i) => [i])])
    expect(summarize(big).sampleRows).toHaveLength(5)
  })
})
