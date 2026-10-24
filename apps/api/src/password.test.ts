import { createHash } from 'node:crypto'
import cookie from '@fastify/cookie'
import argon2 from 'argon2'
import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, sendText } = vi.hoisted(() => {
  const fn = () => vi.fn()
  return {
    sendText: vi.fn(),
    db: {
      user: { findUnique: fn(), findUniqueOrThrow: fn(), update: fn() },
      telegramLink: { findMany: fn() },
      passwordReset: { findFirst: fn(), create: fn(), findUnique: fn(), updateMany: fn() },
      session: { findUnique: fn(), deleteMany: fn() },
      $transaction: (ops: unknown[]) => Promise.all(ops),
    },
  }
})
vi.mock('@app/shared', () => ({
  db,
  env: { APP_URL: 'https://app.test' },
  getMessaging: () => ({ sendText }),
  randomToken: () => 'tok123',
}))

import { passwordRoutes } from './password'

const sha = (t: string) => createHash('sha256').update(t).digest('hex')
const tick = () => new Promise((r) => setTimeout(r, 20))

async function makeApp() {
  const app = Fastify()
  await app.register(cookie)
  await app.register(passwordRoutes)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  db.passwordReset.findFirst.mockResolvedValue(null)
  db.passwordReset.updateMany.mockResolvedValue({ count: 1 })
})

describe('forgot password (reset link via Telegram)', () => {
  it('gives the same answer for unknown emails and sends nothing', async () => {
    const app = await makeApp()
    db.user.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'nobody@x.com' } })
    await tick()
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toMatch(/If that account/)
    expect(db.passwordReset.create).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('sends a one-time link to the linked chat and stores only the token hash', async () => {
    const app = await makeApp()
    db.user.findUnique.mockResolvedValue({ id: 'u1' })
    db.telegramLink.findMany.mockResolvedValue([{ chatId: '555' }])
    const res = await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'Me@X.com' } })
    expect(res.json().message).toMatch(/If that account/)
    await vi.waitFor(() => expect(sendText).toHaveBeenCalled())

    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'me@x.com' } })
    expect(db.passwordReset.create.mock.calls[0][0].data).toMatchObject({ userId: 'u1', tokenHash: sha('tok123') })
    expect(sendText).toHaveBeenCalledWith('555', expect.stringContaining('https://app.test/reset-password?token=tok123'))
  })

  it('sends nothing when Telegram is not linked or a link was just sent', async () => {
    const app = await makeApp()
    db.user.findUnique.mockResolvedValue({ id: 'u1' })
    db.telegramLink.findMany.mockResolvedValue([])
    await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'me@x.com' } })
    await tick()
    expect(sendText).not.toHaveBeenCalled()

    db.telegramLink.findMany.mockResolvedValue([{ chatId: '555' }])
    db.passwordReset.findFirst.mockResolvedValue({ id: 'recent' })
    await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'me@x.com' } })
    await tick()
    expect(db.passwordReset.create).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })
})

describe('reset password', () => {
  const valid = { id: 'r1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 60_000) }

  it('sets the new password, marks the link used and logs out everywhere', async () => {
    const app = await makeApp()
    db.passwordReset.findUnique.mockResolvedValue(valid)
    const res = await app.inject({ method: 'POST', url: '/api/auth/reset', payload: { token: 'tok123', password: 'brand-new-pass' } })

    expect(res.statusCode).toBe(200)
    expect(db.passwordReset.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha('tok123') } })
    const { passwordHash } = db.user.update.mock.calls[0][0].data
    expect(await argon2.verify(passwordHash, 'brand-new-pass')).toBe(true)
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })

  it('rejects unknown, expired, used or already-claimed links', async () => {
    const app = await makeApp()
    const attempt = () => app.inject({ method: 'POST', url: '/api/auth/reset', payload: { token: 'tok123', password: 'brand-new-pass' } })

    db.passwordReset.findUnique.mockResolvedValue(null)
    expect((await attempt()).statusCode).toBe(400)
    db.passwordReset.findUnique.mockResolvedValue({ ...valid, expiresAt: new Date(Date.now() - 1000) })
    expect((await attempt()).statusCode).toBe(400)
    db.passwordReset.findUnique.mockResolvedValue({ ...valid, usedAt: new Date() })
    expect((await attempt()).statusCode).toBe(400)
    db.passwordReset.findUnique.mockResolvedValue(valid)
    db.passwordReset.updateMany.mockResolvedValue({ count: 0 }) // another request used it first
    expect((await attempt()).statusCode).toBe(400)

    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('enforces the minimum password length', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/auth/reset', payload: { token: 'tok123', password: 'short' } })
    expect(res.statusCode).toBe(400)
  })
})

describe('change password', () => {
  async function loggedIn() {
    const app = await makeApp()
    db.session.findUnique.mockResolvedValue({ userId: 'u1', expiresAt: new Date(Date.now() + 60_000) })
    db.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', passwordHash: await argon2.hash('old-password') })
    return app
  }
  const change = (app: Awaited<ReturnType<typeof makeApp>>, currentPassword: string) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: 'sid=my-session' },
      payload: { currentPassword, newPassword: 'new-password' },
    })

  it('requires the correct current password', async () => {
    const res = await change(await loggedIn(), 'wrong-password')
    expect(res.statusCode).toBe(400)
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('changes the password and logs out other devices only', async () => {
    const res = await change(await loggedIn(), 'old-password')
    expect(res.statusCode).toBe(200)
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', id: { not: sha('my-session') } } })
  })

  it('requires login', async () => {
    const app = await makeApp()
    db.session.findUnique.mockResolvedValue(null)
    expect((await change(app, 'old-password')).statusCode).toBe(401)
  })
})
