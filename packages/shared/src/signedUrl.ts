import { sign, verifySignature } from './crypto'
import { env } from './env'

/** Expiring signed download link for a stored file. */
export function signedFileUrl(fileId: string, ttlHours = env.DOWNLOAD_LINK_TTL_HOURS, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + Math.round(ttlHours * 3600)
  return `${env.APP_URL}/api/files/${fileId}?exp=${exp}&sig=${sign(`${fileId}.${exp}`)}`
}

export function verifyFileSignature(fileId: string, exp: string, sig: string, now = Date.now()): boolean {
  const expSeconds = Number(exp)
  if (!Number.isInteger(expSeconds) || expSeconds * 1000 < now) return false
  return verifySignature(`${fileId}.${exp}`, sig)
}

/** Signed OAuth `state` that carries the user id for 10 minutes. */
export function createOAuthState(userId: string): string {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + 600}`
  return `${payload}.${sign(payload)}`
}

export function readOAuthState(state: string): string | null {
  const [userId, exp, sig] = state.split('.')
  if (!userId || !exp || !sig) return null
  if (Number(exp) * 1000 < Date.now() || !verifySignature(`${userId}.${exp}`, sig)) return null
  return userId
}
