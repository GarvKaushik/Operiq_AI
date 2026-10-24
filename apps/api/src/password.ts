import argon2 from 'argon2'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, env, getMessaging, randomToken } from '@app/shared'
import { SESSION_COOKIE, hashToken, requireUser } from './auth'

const RESET_MINUTES = 15
const RESEND_COOLDOWN_SECONDS = 60
const INVALID_LINK = 'This reset link is invalid or has expired. Please request a new one.'
// Same answer whether or not the account exists, so the form can't be used to discover accounts
const GENERIC_REPLY = { ok: true, message: 'If that account has Telegram linked, we sent a reset link there.' }

const newPassword = z.string().min(8, 'Password must be at least 8 characters')

/** Create a one-time reset link and send it to the user's linked Telegram chats. */
export async function sendResetLink(email: string) {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return
  const chats = await db.telegramLink.findMany({ where: { userId: user.id, chatId: { not: null } } })
  if (!chats.length) return
  const recent = await db.passwordReset.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) } },
  })
  if (recent) return // avoid flooding the chat

  const token = randomToken()
  await db.passwordReset.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) },
  })
  const url = `${env.APP_URL}/reset-password?token=${token}`
  const messaging = getMessaging('telegram')
  for (const chat of chats) {
    await messaging.sendText(
      chat.chatId!,
      `🔑 Password reset requested for ${email}.\n\nSet a new password (link expires in ${RESET_MINUTES} minutes):\n${url}\n\nIf this wasn't you, ignore this message.`,
    )
  }
}

export async function passwordRoutes(app: FastifyInstance) {
  app.post('/api/auth/forgot', async (request, reply) => {
    const body = z.object({ email: z.email().transform((e) => e.toLowerCase()) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Please enter a valid email' })
    // Runs in the background so the response time doesn't reveal whether the account exists
    sendResetLink(body.data.email).catch((err) => request.log.error({ err }, 'password reset link not sent'))
    return GENERIC_REPLY
  })

  app.post('/api/auth/reset', async (request, reply) => {
    const body = z.object({ token: z.string().min(1), password: newPassword }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })

    const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(body.data.token) } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) return reply.code(400).send({ error: INVALID_LINK })

    // Mark used first; only one request can win, so a link works exactly once
    const { count } = await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } })
    if (count !== 1) return reply.code(400).send({ error: INVALID_LINK })

    await db.$transaction([
      db.user.update({ where: { id: reset.userId }, data: { passwordHash: await argon2.hash(body.data.password) } }),
      db.session.deleteMany({ where: { userId: reset.userId } }), // log out everywhere
    ])
    return { ok: true }
  })

  app.post('/api/auth/change-password', { preHandler: requireUser }, async (request, reply) => {
    const body = z.object({ currentPassword: z.string().min(1), newPassword }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })

    const user = await db.user.findUniqueOrThrow({ where: { id: request.userId } })
    if (!(await argon2.verify(user.passwordHash, body.data.currentPassword))) {
      return reply.code(400).send({ error: 'Current password is incorrect' })
    }
    const currentSession = hashToken(request.cookies[SESSION_COOKIE]!)
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await argon2.hash(body.data.newPassword) } }),
      db.session.deleteMany({ where: { userId: user.id, id: { not: currentSession } } }), // log out other devices
    ])
    return { ok: true }
  })
}
