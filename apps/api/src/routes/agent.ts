import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@app/shared'
import { requireUser } from '../auth'

const agentBody = z.object({
  name: z.string().trim().min(1, 'Give your agent a name').max(30),
  avatar: z.string().regex(/^[a-z0-9-]{1,30}$/, 'Invalid avatar'),
  personality: z.string().trim().max(500).optional(),
})

/** The user's assistant persona (one per user). */
export async function agentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/api/agent', async (request) => {
    return db.agent.findUnique({ where: { userId: request.userId } })
  })

  app.put('/api/agent', async (request, reply) => {
    const body = agentBody.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    const data = { ...body.data, personality: body.data.personality || null }
    return db.agent.upsert({
      where: { userId: request.userId },
      create: { userId: request.userId, ...data },
      update: data,
    })
  })
}
