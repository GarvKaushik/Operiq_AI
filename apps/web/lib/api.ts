/** Fetch JSON from the API. Redirects to /login when the session is missing. */
export async function api<T = any>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 401 && !path.startsWith('/api/auth')) {
    window.location.href = '/login'
    throw new Error('Not logged in')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export type Agent = { name: string; avatar: string; personality: string | null }

export type Me = {
  email: string
  name: string | null
  agent: Agent | null
  telegramLinked: boolean
  botUsername: string
  integrations: { provider: string; meta: { team?: string } | null }[]
}

export const statusStyle: Record<string, { label: string; className: string }> = {
  queued: { label: 'Pending', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  running: { label: 'Running', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  awaiting_confirmation: { label: 'Needs confirmation', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Failed', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  rejected: { label: 'Refused', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

/** "5 min ago", "2 h ago", or a date for older items. */
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return new Date(iso).toLocaleDateString()
}
