import { createHash } from 'node:crypto'
import argon2 from 'argon2'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { db, randomToken } from '@app/shared'

const SESSION_COOKIE = 'sid'
const SESSION_DAYS = 14

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

async function startSession(reply: FastifyReply, userId: string) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } })
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  })
}

/** preHandler: rejects requests without a valid session and sets `request.userId`. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE]
  const session = token && (await db.session.findUnique({ where: { id: hashToken(token) } }))
  if (!session || session.expiresAt < new Date()) {
    return reply.code(401).send({ error: 'Not logged in' })
  }
  request.userId = session.userId
}

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const body = credentials.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    if (await db.user.findUnique({ where: { email: body.data.email } })) {
      return reply.code(409).send({ error: 'Email already registered' })
    }
    const user = await db.user.create({
      data: { email: body.data.email, passwordHash: await argon2.hash(body.data.password) },
    })
    await startSession(reply, user.id)
    return { ok: true }
  })

  app.post('/api/auth/login', async (request, reply) => {
    const body = credentials.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid email or password' })
    const user = await db.user.findUnique({ where: { email: body.data.email } })
    if (!user || !(await argon2.verify(user.passwordHash, body.data.password))) {
      return reply.code(401).send({ error: 'Invalid email or password' })
    }
    await startSession(reply, user.id)
    return { ok: true }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await db.session.deleteMany({ where: { id: hashToken(token) } })
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })
}
