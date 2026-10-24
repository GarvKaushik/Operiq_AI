'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import StatusBadge from '@/components/StatusBadge'
import { api, timeAgo } from '@/lib/api'
import { card } from '@/lib/ui'

type Task = { id: string; instruction: string; status: string; createdAt: string }

const FILTERS = ['all', 'running', 'awaiting_confirmation', 'completed', 'failed'] as const
const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  running: 'Running',
  awaiting_confirmation: 'Needs confirmation',
  completed: 'Completed',
  failed: 'Failed',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')

  useEffect(() => {
    const load = () => api<Task[]>('/api/tasks').then(setTasks)
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  const shown = tasks?.filter((t) => filter === 'all' || t.status === filter || (filter === 'running' && t.status === 'queued'))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="mt-1 text-slate-500">Every instruction you send becomes a task. Updates live.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition ${
              filter === f ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {!shown ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : shown.length === 0 ? (
        <div className={`${card} flex flex-col items-center p-12 text-center`}>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon name="chat" />
          </div>
          <p className="mt-4 font-semibold">No tasks here yet</p>
          <p className="mt-1 text-sm text-slate-500">Send your agent an instruction on Telegram to create one.</p>
        </div>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <Icon name="chat" className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{t.instruction}</p>
                  <p className="text-xs text-slate-400">{timeAgo(t.createdAt)}</p>
                </div>
                <StatusBadge status={t.status} />
                <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
