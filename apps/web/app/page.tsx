'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import SavedSheets from './SavedSheets'

type Me = {
  email: string
  telegramLinked: boolean
  integrations: { provider: string; meta: { team?: string } | null }[]
}
type Channel = { id: string; name: string; allowed: boolean }

const card = 'rounded-lg border bg-white p-5 space-y-3'
const button = 'inline-block rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'

export default function IntegrationsPage() {
  const [me, setMe] = useState<Me>()
  const [linkUrl, setLinkUrl] = useState('')
  const [channels, setChannels] = useState<Channel[]>([])
  const slack = me?.integrations.find((i) => i.provider === 'slack')
  const google = me?.integrations.find((i) => i.provider === 'google')

  useEffect(() => {
    api<Me>('/api/me').then(setMe)
  }, [])
  useEffect(() => {
    if (slack) api<Channel[]>('/api/slack/channels').then(setChannels).catch(() => setChannels([]))
  }, [slack])

  async function createLink() {
    setLinkUrl((await api<{ url: string }>('/api/telegram/link', { method: 'POST' })).url)
  }

  async function toggle(channel: Channel) {
    await api('/api/slack/destinations', { method: 'PUT', body: { ...channel, allowed: !channel.allowed } })
    setChannels((list) => list.map((c) => (c.id === channel.id ? { ...c, allowed: !c.allowed } : c)))
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (!me) return <p>Loading…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <span className="text-sm text-gray-500">
          {me.email} · <button onClick={logout} className="underline">Log out</button>
        </span>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Telegram {me.telegramLinked && <span className="text-green-600">✓ linked</span>}</h2>
        <button onClick={createLink} className={button}>Link Telegram</button>
        {linkUrl && (
          <p className="text-sm">
            Open within 10 minutes: <a href={linkUrl} target="_blank" className="text-indigo-600 underline">{linkUrl}</a>
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Google Sheets & Calendar {google && <span className="text-green-600">✓ connected</span>}</h2>
        <a href="/api/oauth/google/start" className={button}>{google ? 'Reconnect' : 'Connect'} Google</a>
        {google && <SavedSheets />}
      </section>

      <section className={card}>
        <h2 className="font-semibold">
          Slack {slack && <span className="text-green-600">✓ {slack.meta?.team ?? 'connected'}</span>}
        </h2>
        <a href="/api/oauth/slack/start" className={button}>{slack ? 'Reconnect' : 'Connect'} Slack</a>
        {slack && (
          <div>
            <p className="mb-2 text-sm text-gray-600">Approved channels. The assistant can only post to checked channels.</p>
            <ul className="space-y-1">
              {channels.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={c.allowed} onChange={() => toggle(c)} /> #{c.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
