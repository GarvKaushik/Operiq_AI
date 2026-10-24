import { google } from 'googleapis'
import { googleClientFor } from './integrations'

/** Spreadsheet ID from a Google Sheets link or a raw ID. Null if it's neither. */
export function parseSpreadsheetId(input: string): string | null {
  const text = input.trim()
  const fromUrl = text.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/)
  if (fromUrl) return fromUrl[1]
  return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : null
}

/** The sheet's title. Also proves the user's Google account can read it. */
export async function fetchSheetTitle(userId: string, spreadsheetId: string): Promise<string> {
  const sheets = google.sheets({ version: 'v4', auth: await googleClientFor(userId) })
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title' })
  return res.data.properties?.title ?? spreadsheetId
}
