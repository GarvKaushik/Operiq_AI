import { describe, expect, it } from 'vitest'
import { resolveSheet } from './data'

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab'
const saved = [
  { name: 'sales', spreadsheetId: 'SALES_ID', range: 'Data!A1:F500', isDefault: true },
  { name: 'expenses', spreadsheetId: 'EXPENSES_ID', range: null, isDefault: false },
]

describe('resolveSheet', () => {
  it('finds a saved sheet by name, ignoring case and spaces', () => {
    expect(resolveSheet(saved, 'expenses')).toEqual({ spreadsheetId: 'EXPENSES_ID', range: null })
    expect(resolveSheet(saved, ' Sales ')).toEqual({ spreadsheetId: 'SALES_ID', range: 'Data!A1:F500' })
  })

  it('uses the default sheet when no sheet is given', () => {
    expect(resolveSheet(saved, undefined).spreadsheetId).toBe('SALES_ID')
    expect(resolveSheet(saved, '').spreadsheetId).toBe('SALES_ID')
  })

  it('accepts a link or raw ID for one-off sheets', () => {
    expect(resolveSheet(saved, `https://docs.google.com/spreadsheets/d/${ID}/edit`)).toEqual({ spreadsheetId: ID, range: null })
    expect(resolveSheet([], ID).spreadsheetId).toBe(ID)
  })

  it('explains unknown names and a missing default', () => {
    expect(() => resolveSheet(saved, 'marketing')).toThrow('No saved sheet called "marketing". Saved sheets: sales, expenses')
    expect(() => resolveSheet([], undefined)).toThrow(/no default sheet saved/)
  })
})
