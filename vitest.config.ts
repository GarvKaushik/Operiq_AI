import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['apps/api/**/*.test.ts', 'apps/worker/**/*.test.ts', 'packages/**/*.test.ts'],
    // Test-only secrets; tests never touch Postgres, Redis or the network
    env: {
      SIGNING_SECRET: 'test-signing-secret',
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      APP_URL: 'http://localhost:3000',
    },
  },
})
