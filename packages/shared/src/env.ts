import { config } from 'dotenv'
import { resolve } from 'node:path'
import { z } from 'zod'

export const ROOT_DIR = resolve(import.meta.dirname, '../../..')
config({ path: resolve(ROOT_DIR, '.env'), quiet: true })

const schema = z.object({
  DATABASE_URL: z.string().default('postgresql://app:app@localhost:5432/app'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  APP_URL: z.string().default('http://localhost:3000'),
  API_PORT: z.coerce.number().default(4000),
  ENCRYPTION_KEY: z.string().default(''),
  SIGNING_SECRET: z.string().default(''),
  OPENAI_BASE_URL: z.string().default('https://ollama.com/v1'),
  OPENAI_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('gpt-oss:120b'),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_BOT_USERNAME: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  SLACK_CLIENT_ID: z.string().default(''),
  SLACK_CLIENT_SECRET: z.string().default(''),
  STORAGE_DIR: z.string().default('./storage'),
  DOWNLOAD_LINK_TTL_HOURS: z.coerce.number().default(24),
  TIMEZONE: z.string().default('UTC'),
})

export const env = schema.parse(process.env)
export const storageDir = resolve(ROOT_DIR, env.STORAGE_DIR)

/** Read a setting that must be configured for the feature being used. */
export function required(name: keyof typeof env): string {
  const value = env[name]
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`)
  return String(value)
}
