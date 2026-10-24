import { WebClient } from '@slack/web-api'
import type { FastifyInstance } from 'fastify'
import {
  GOOGLE_SCOPES,
  createOAuthState,
  env,
  googleOAuthClient,
  required,
  saveIntegration,
  verifyOAuthState,
} from '@app/shared'
import { requireUser } from '../auth'

const SLACK_SCOPES = ['chat:write', 'chat:write.public', 'chat:write.customize', 'channels:read', 'channels:join', 'files:write']
const slackRedirect = () => `${env.APP_URL}/api/oauth/slack/callback`
const backToDashboard = (status: string) => `${env.APP_URL}/dashboard?connected=${status}`

type Callback = { Querystring: { code?: string; state?: string; error?: string } }

export async function oauthRoutes(app: FastifyInstance) {
  app.get('/api/oauth/google/start', { preHandler: requireUser }, async (request, reply) => {
    const url = googleOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: createOAuthState(request.userId),
    })
    return reply.redirect(url)
  })

  // Callbacks require login, and the state must belong to the logged-in user
  app.get<Callback>('/api/oauth/google/callback', { preHandler: requireUser }, async (request, reply) => {
    const { code, state } = request.query
    if (!code || !state || !verifyOAuthState(state, request.userId)) {
      return reply.redirect(backToDashboard('google_failed'))
    }
    const { tokens } = await googleOAuthClient().getToken(code)
    await saveIntegration(request.userId, 'google', tokens)
    return reply.redirect(backToDashboard('google'))
  })

  app.get('/api/oauth/slack/start', { preHandler: requireUser }, async (request, reply) => {
    const params = new URLSearchParams({
      client_id: required('SLACK_CLIENT_ID'),
      scope: SLACK_SCOPES.join(','),
      redirect_uri: slackRedirect(),
      state: createOAuthState(request.userId),
    })
    return reply.redirect(`https://slack.com/oauth/v2/authorize?${params}`)
  })

  app.get<Callback>('/api/oauth/slack/callback', { preHandler: requireUser }, async (request, reply) => {
    const { code, state } = request.query
    if (!code || !state || !verifyOAuthState(state, request.userId)) {
      return reply.redirect(backToDashboard('slack_failed'))
    }
    const res = await new WebClient().oauth.v2.access({
      client_id: required('SLACK_CLIENT_ID'),
      client_secret: required('SLACK_CLIENT_SECRET'),
      code,
      redirect_uri: slackRedirect(),
    })
    await saveIntegration(request.userId, 'slack', { access_token: res.access_token }, { team: res.team?.name })
    return reply.redirect(backToDashboard('slack'))
  })
}
