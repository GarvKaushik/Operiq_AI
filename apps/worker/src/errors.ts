const NETWORK_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE']
const SLACK_TRANSIENT = ['slack_webapi_rate_limited_error', 'slack_webapi_request_error']

/** Network failures, 429 and 5xx are worth retrying; everything else is not. */
export function isTransient(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { status?: unknown; code?: unknown; response?: { status?: unknown }; cause?: unknown }
  const status = typeof e.status === 'number' ? e.status : e.response?.status
  if (typeof status === 'number') return status === 429 || status >= 500
  if (typeof e.code === 'string' && (NETWORK_CODES.includes(e.code) || SLACK_TRANSIENT.includes(e.code))) return true
  return e.cause ? isTransient(e.cause) : false
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Thrown by a tool call that needs the user's approval before it runs. */
export class NeedsConfirmation extends Error {
  constructor(public question: string) {
    super('Needs confirmation')
  }
}
