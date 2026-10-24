import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { env } from '@app/shared'
import { authRoutes } from './auth'
import { passwordRoutes } from './password'
import { agentRoutes } from './routes/agent'
import { startBot } from './bot'
import { dashboardRoutes } from './routes/dashboard'
import { fileRoutes } from './routes/files'
import { oauthRoutes } from './routes/oauth'
import { sheetRoutes } from './routes/sheets'

const app = Fastify({
  logger: {
    // never log query strings: they carry OAuth codes and download signatures
    serializers: { req: (req) => ({ method: req.method, url: req.url.split('?')[0] }) },
  },
})

await app.register(cookie)
await app.register(authRoutes)
await app.register(passwordRoutes)
await app.register(oauthRoutes)
await app.register(fileRoutes)
await app.register(dashboardRoutes)
await app.register(sheetRoutes)
await app.register(agentRoutes)

app.get('/health', async () => ({ ok: true }))

await app.listen({ port: env.API_PORT, host: '0.0.0.0' })

if (env.TELEGRAM_BOT_TOKEN) startBot()
else app.log.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot disabled')
