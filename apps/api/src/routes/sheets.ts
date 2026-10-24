import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, fetchSheetTitle, parseSpreadsheetId } from '@app/shared'
import { requireUser } from '../auth'

const newSheet = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9 _-]{0,39}$/, 'Name: up to 40 letters, numbers, spaces, - or _'),
  link: z.string().min(1, 'Paste the Google Sheet link'),
  range: z.string().trim().optional(),
})

/** Sheets saved under short names, so chat can say "my sales sheet". */
export async function sheetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/api/sheets', async (request) => {
    return db.savedSheet.findMany({ where: { userId: request.userId }, orderBy: { name: 'asc' } })
  })

  app.post('/api/sheets', async (request, reply) => {
    const body = newSheet.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    const { name, link, range } = body.data
    const spreadsheetId = parseSpreadsheetId(link)
    if (!spreadsheetId) return reply.code(400).send({ error: 'That does not look like a Google Sheets link' })

    let title: string
    try {
      title = await fetchSheetTitle(request.userId, spreadsheetId)
    } catch (err) {
      return reply.code(400).send({ error: `Could not open the sheet with your Google account: ${(err as Error).message}` })
    }

    const userId = request.userId
    const isFirst = (await db.savedSheet.count({ where: { userId } })) === 0
    const data = { spreadsheetId, title, range: range || null }
    return db.savedSheet.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, ...data, isDefault: isFirst },
      update: data,
    })
  })

  app.put<{ Params: { id: string } }>('/api/sheets/:id/default', async (request, reply) => {
    const { userId } = request
    const sheet = await db.savedSheet.findFirst({ where: { id: request.params.id, userId } })
    if (!sheet) return reply.code(404).send({ error: 'Not found' })
    await db.$transaction([
      db.savedSheet.updateMany({ where: { userId }, data: { isDefault: false } }),
      db.savedSheet.update({ where: { id: sheet.id }, data: { isDefault: true } }),
    ])
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>('/api/sheets/:id', async (request) => {
    await db.savedSheet.deleteMany({ where: { id: request.params.id, userId: request.userId } })
    return { ok: true }
  })
}
