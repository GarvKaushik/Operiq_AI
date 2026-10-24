'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, statusColor } from '@/lib/api'

type Task = { id: string; instruction: string; status: string; createdAt: string }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>()

  useEffect(() => {
    const load = () => api<Task[]>('/api/tasks').then(setTasks)
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  if (!tasks) return <p>Loading…</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      {tasks.length === 0 && <p className="text-gray-500">No tasks yet. Send the Telegram bot an instruction.</p>}
      <ul className="divide-y rounded-lg border bg-white">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50">
              <span className="truncate">{t.instruction}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                {new Date(t.createdAt).toLocaleString()}
                <span className={`rounded px-2 py-0.5 ${statusColor[t.status]}`}>{t.status}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
