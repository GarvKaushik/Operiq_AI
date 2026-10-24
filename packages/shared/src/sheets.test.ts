import { describe, expect, it } from 'vitest'
import { parseSpreadsheetId } from './sheets'

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab'

describe('parseSpreadsheetId', () => {
  it('extracts the ID from sheet links', () => {
    expect(parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`)).toBe(ID)
    expect(parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${ID}`)).toBe(ID)
    expect(parseSpreadsheetId(`  https://docs.google.com/spreadsheets/u/1/d/${ID}/edit?usp=sharing `)).toBe(ID)
  })

  it('accepts a raw ID', () => {
    expect(parseSpreadsheetId(ID)).toBe(ID)
  })

  it('rejects anything else', () => {
    expect(parseSpreadsheetId('sales')).toBeNull()
    expect(parseSpreadsheetId('https://example.com/sheet')).toBeNull()
    expect(parseSpreadsheetId('')).toBeNull()
  })
})
