import ExcelJS from 'exceljs'
import { google } from 'googleapis'
import { db, googleClientFor, parseSpreadsheetId } from '@app/shared'
import { rowsToTable, type Table } from './analysis'

export type Source = { file_id?: string; sheet?: string; range?: string }
type SavedSheetRef = { name: string; spreadsheetId: string; range: string | null; isDefault: boolean }

/** Load a table from an uploaded file or a Google Sheet. */
export async function loadTable(source: Source, userId: string): Promise<Table> {
  if (source.file_id) return loadFile(source.file_id, userId)
  const saved = await db.savedSheet.findMany({ where: { userId } })
  const sheet = resolveSheet(saved, source.sheet)
  return loadSheet(sheet.spreadsheetId, source.range ?? sheet.range ?? 'A1:Z1000', userId)
}

/** Saved sheet name, sheet link or raw ID -> spreadsheet ID. No input means the default sheet. */
export function resolveSheet(saved: SavedSheetRef[], input?: string) {
  const names = saved.map((s) => s.name).join(', ') || 'none'
  const text = input?.trim() ?? ''
  if (!text) {
    const fallback = saved.find((s) => s.isDefault)
    if (!fallback) throw new Error(`No sheet given and no default sheet saved. Saved sheets: ${names}`)
    return { spreadsheetId: fallback.spreadsheetId, range: fallback.range }
  }
  const byName = saved.find((s) => s.name === text.toLowerCase())
  if (byName) return { spreadsheetId: byName.spreadsheetId, range: byName.range }
  const id = parseSpreadsheetId(text)
  if (id) return { spreadsheetId: id, range: null }
  throw new Error(
    `No saved sheet called "${text}". Saved sheets: ${names}. ` +
      'Ask the user for the sheet link, or to save it in the dashboard.',
  )
}

async function loadFile(fileId: string, userId: string): Promise<Table> {
  const file = await db.file.findFirst({ where: { id: fileId, userId } })
  if (!file) throw new Error(`File ${fileId} not found. Use list_files to see available files.`)

  const workbook = new ExcelJS.Workbook()
  const sheet = file.name.toLowerCase().endsWith('.csv')
    ? await workbook.csv.readFile(file.path, { map: (value: unknown) => value }) // keep raw strings
    : (await workbook.xlsx.readFile(file.path), workbook.worksheets[0])
  if (!sheet) throw new Error('The file has no worksheets')

  const raw: unknown[][] = []
  sheet.eachRow((row) => {
    raw.push((row.values as ExcelJS.CellValue[]).slice(1).map(cellValue))
  })
  return rowsToTable(raw)
}

/** Flatten ExcelJS cell objects (formulas, rich text, links) to plain values. */
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || typeof v !== 'object' || v instanceof Date) return v
  if ('result' in v) return v.result
  if ('richText' in v) return v.richText.map((t) => t.text).join('')
  if ('text' in v) return v.text
  return null
}

async function loadSheet(spreadsheetId: string, range: string, userId: string): Promise<Table> {
  const sheets = google.sheets({ version: 'v4', auth: await googleClientFor(userId) })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: 'UNFORMATTED_VALUE' })
  return rowsToTable(res.data.values ?? [])
}
