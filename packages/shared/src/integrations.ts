import { google } from 'googleapis'
import { decrypt, encrypt } from './crypto'
import { db } from './db'
import { env, required } from './env'

export type Provider = 'google' | 'slack'

export async function saveIntegration(userId: string, provider: Provider, tokens: object, meta?: object) {
  const data = { tokens: encrypt(JSON.stringify(tokens)), meta: meta ?? undefined }
  await db.integration.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...data },
    update: data,
  })
}

export async function loadTokens<T = Record<string, any>>(userId: string, provider: Provider): Promise<T | null> {
  const row = await db.integration.findUnique({ where: { userId_provider: { userId, provider } } })
  return row ? (JSON.parse(decrypt(row.tokens)) as T) : null
}

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

export function googleOAuthClient() {
  return new google.auth.OAuth2(
    required('GOOGLE_CLIENT_ID'),
    required('GOOGLE_CLIENT_SECRET'),
    `${env.APP_URL}/api/oauth/google/callback`,
  )
}

/** OAuth client for a user; refreshed tokens are re-encrypted and saved. */
export async function googleClientFor(userId: string) {
  const tokens = await loadTokens(userId, 'google')
  if (!tokens) throw new Error('Google is not connected. Connect it in the dashboard.')
  const client = googleOAuthClient()
  client.setCredentials(tokens)
  client.on('tokens', (fresh) => {
    saveIntegration(userId, 'google', { ...tokens, ...fresh }).catch(() => {})
  })
  return client
}
