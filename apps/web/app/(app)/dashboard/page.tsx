'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import AgentAvatar from '@/components/AgentAvatar'
import Icon from '@/components/Icon'
import SavedSheets from '@/components/SavedSheets'
import StatusBadge from '@/components/StatusBadge'
import TelegramLink from '@/components/TelegramLink'
import { api, timeAgo } from '@/lib/api'
import { useMe } from '@/lib/me'
import { btnPrimary, btnSecondary, card } from '@/lib/ui'

type Channel = { id: string; name: string; allowed: boolean }
type TaskRow = { id: string; instruction: string; status: string; createdAt: string }

const CONNECTED_MESSAGES: Record<string, string> = {
  google: 'Google connected',
  slack: 'Slack connected',
  google_failed: 'Google connection failed. Please try again.',
  slack_failed: 'Slack connection failed. Please try again.',
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

function Integration({ icon, title, subtitle, connected, children }: { icon: string; title: string; subtitle: string; connected: boolean; children: ReactNode }) {
  return (
    <section className={`${card} space-y-4 p-6`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          <Icon name={icon} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {connected ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Connected</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Not connected</span>
            )}
          </div>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const { me } = useMe()
  const [channels, setChannels] = useState<Channel[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [notice, setNotice] = useState('')
  const slack = me.integrations.find((i) => i.provider === 'slack')
  const google = me.integrations.find((i) => i.provider === 'google')
  const connectedCount = [me.telegramLinked, google, slack].filter(Boolean).length

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('connected')
    if (status) setNotice(CONNECTED_MESSAGES[status] ?? '')
    api<TaskRow[]>('/api/tasks').then(setTasks)
  }, [])

  useEffect(() => {
    if (slack) api<Channel[]>('/api/slack/channels').then(setChannels).catch(() => setChannels([]))
  }, [slack])

  async function toggle(channel: Channel) {
    await api('/api/slack/destinations', { method: 'PUT', body: { ...channel, allowed: !channel.allowed } })
    setChannels((list) => list.map((c) => (c.id === channel.id ? { ...c, allowed: !c.allowed } : c)))
  }

  const completed = tasks.filter((t) => t.status === 'completed').length

  return (
    <div className="space-y-8">
      {notice && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ring-1 ${notice.includes('failed') ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
          {notice}
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-500/20 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <AgentAvatar avatar={me.agent?.avatar} size="lg" />
          <div>
            <p className="text-sm text-indigo-100">{greeting()}{me.name ? `, ${me.name.split(' ')[0]}` : ''}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{me.agent?.name} is ready to help</h1>
            <p className="mt-1 text-sm text-indigo-100">
              Try: "Summarize my sales sheet and post it to #sales"
            </p>
          </div>
        </div>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Connected apps', value: `${connectedCount} / 3` },
          { label: 'Tasks', value: tasks.length },
          { label: 'Completed', value: completed },
        ].map((s) => (
          <div key={s.label} className={`${card} p-5`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Integration icon="chat" title="Telegram" subtitle="Where you chat with your agent." connected={me.telegramLinked}>
            <TelegramLink linked={me.telegramLinked} />
          </Integration>

          <Integration icon="sheet" title="Google Sheets & Calendar" subtitle="Read sheets and create events with Meet links." connected={Boolean(google)}>
            <a href="/api/oauth/google/start" className={google ? btnSecondary : btnPrimary}>{google ? 'Reconnect Google' : 'Connect Google'}</a>
            {google && <SavedSheets />}
          </Integration>

          <Integration
            icon="slack"
            title="Slack"
            subtitle={slack ? `Workspace: ${slack.meta?.team ?? 'connected'}` : 'Post updates to channels you approve.'}
            connected={Boolean(slack)}
          >
            <a href="/api/oauth/slack/start" className={slack ? btnSecondary : btnPrimary}>{slack ? 'Reconnect Slack' : 'Connect Slack'}</a>
            {slack && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-900">Approved channels</p>
                <p className="text-sm text-slate-500">Your agent can only post to the channels you switch on.</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {channels.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => toggle(c)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 transition ${
                          c.allowed ? 'bg-indigo-50 text-indigo-800 ring-indigo-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        #{c.name}
                        <span className={`relative h-5 w-9 rounded-full transition ${c.allowed ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${c.allowed ? 'left-4.5' : 'left-0.5'}`} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Integration>
        </div>

        {/* Recent tasks */}
        <section className={`${card} h-fit p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent tasks</h2>
            <Link href="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">View all</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No tasks yet. Send your agent a message to get started.</p>
          ) : (
            <ul className="mt-4 space-y-1">
              {tasks.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="block rounded-xl p-2.5 transition hover:bg-slate-50">
                    <p className="truncate text-sm font-medium text-slate-800">{t.instruction}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-slate-400">{timeAgo(t.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
