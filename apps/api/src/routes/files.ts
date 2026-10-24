import { createReadStream } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import { db, verifyFileSignature } from '@app/shared'

type Download = { Params: { id: string }; Querystring: { exp?: string; sig?: string } }

/** Files are only served through expiring HMAC-signed links. */
export async function fileRoutes(app: FastifyInstance) {
  app.get<Download>('/api/files/:id', async (request, reply) => {
    const { id } = request.params
    const { exp = '', sig = '' } = request.query
    if (!verifyFileSignature(id, exp, sig)) return reply.code(403).send({ error: 'Link is invalid or expired' })

    const file = await db.file.findUnique({ where: { id } })
    if (!file) return reply.code(404).send({ error: 'Not found' })
    return reply
      .header('Content-Type', file.mimeType)
      .header('Content-Disposition', `attachment; filename="${file.name.replace(/"/g, '')}"`)
      .send(createReadStream(file.path))
  })
}
