import { WebClient } from '@slack/web-api'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, env, loadTokens, randomToken } from '@app/shared'
import { requireUser } from '../auth'

const LINK_TOKEN_MINUTES = 10

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/api/me', async (request) => {
    const userId = request.userId
    const [user, integrations, link] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, name: true, agent: { select: { name: true, avatar: true, personality: true } } },
      }),
      db.integration.findMany({ where: { userId }, select: { provider: true, meta: true } }),
      db.telegramLink.findFirst({ where: { userId, chatId: { not: null } } }),
    ])
    return { ...user, integrations, telegramLinked: Boolean(link), botUsername: env.TELEGRAM_BOT_USERNAME }
  })

  // One-time Telegram link: user opens t.me/<bot>?start=<token>
  app.post('/api/telegram/link', async (request) => {
    const token = randomToken(16)
    await db.telegramLink.create({
      data: { userId: request.userId, token, expiresAt: new Date(Date.now() + LINK_TOKEN_MINUTES * 60_000) },
    })
    return { url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}` }
  })

  app.get('/api/tasks', async (request) => {
    return db.task.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, instruction: true, status: true, createdAt: true, updatedAt: true },
    })
  })

  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = await db.task.findFirst({
      where: { id: request.params.id, userId: request.userId },
      omit: { agentState: true },
      include: { steps: { orderBy: [{ stepIndex: 'asc' }, { startedAt: 'asc' }] } },
    })
    return task ?? reply.code(404).send({ error: 'Not found' })
  })

  // Slack channels with their allowlist status
  app.get('/api/slack/channels', async (request, reply) => {
    const tokens = await loadTokens<{ access_token: string }>(request.userId, 'slack')
    if (!tokens) return reply.code(400).send({ error: 'Slack is not connected' })
    const slack = new WebClient(tokens.access_token)
    const res = await slack.conversations.list({ types: 'public_channel', exclude_archived: true, limit: 200 })
    const allowed = await db.allowedDestination.findMany({ where: { userId: request.userId, provider: 'slack' } })
    const allowedIds = new Set(allowed.map((d) => d.destinationId))
    return (res.channels ?? []).map((c) => ({ id: c.id, name: c.name, allowed: allowedIds.has(c.id!) }))
  })

  const destinationBody = z.object({ id: z.string().min(1), name: z.string().min(1), allowed: z.boolean() })

  app.put('/api/slack/destinations', async (request, reply) => {
    const body = destinationBody.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid destination' })
    const { id, name, allowed } = body.data
    const key = { userId: request.userId, provider: 'slack', destinationId: id }
    if (allowed) {
      await db.allowedDestination.upsert({
        where: { userId_provider_destinationId: key },
        create: { ...key, name },
        update: { name },
      })
    } else {
      await db.allowedDestination.deleteMany({ where: key })
    }
    return { ok: true }
  })
}
