import { z } from 'zod'

export const sheetField = z
  .string()
  .optional()
  .describe('Saved sheet name (e.g. "sales"), a Google Sheets link, or a spreadsheet ID. Omit to use the default sheet.')

/** Arguments shared by tools that read tabular data. */
export const sourceFields = z.object({
  file_id: z.string().optional().describe('ID of an uploaded file (see list_files)'),
  sheet: sheetField,
  range: z.string().optional().describe('A1 range like "Sheet1!A1:F500". Default A1:Z1000'),
  group_by: z.string().optional().describe('Column to group totals by, e.g. "Region"'),
  value_column: z.string().optional().describe('Numeric column to total per group, e.g. "Revenue"'),
})

export const hasOneSource = (a: { file_id?: string; sheet?: string }) => !(a.file_id && a.sheet)
export const ONE_SOURCE_MESSAGE = 'Provide file_id or sheet, not both'

export const sourceSchema = sourceFields.refine(hasOneSource, ONE_SOURCE_MESSAGE)
