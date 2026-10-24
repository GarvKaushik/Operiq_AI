'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, statusColor } from '@/lib/api'

type Step = {
  id: string
  stepIndex: number
  tool: string
  status: string
  input: unknown
  output: unknown
  error: string | null
  externalId: string | null
  startedAt: string
  finishedAt: string | null
}
type Task = {
  id: string
  instruction: string
  status: string
  result: string | null
  error: string | null
  createdAt: string
  steps: Step[]
}

function Json({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-600">{label}</summary>
      <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-100 p-2">{JSON.stringify(value, null, 2)}</pre>
    </details>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<Task>()

  useEffect(() => {
    const load = () => api<Task>(`/api/tasks/${id}`).then(setTask)
    load()
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [id])

  if (!task) return <p>Loading…</p>

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor[task.status]}`}>{task.status}</span>
        <h1 className="text-xl font-semibold">{task.instruction}</h1>
        <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleString()}</p>
      </div>

      {task.result && <p className="whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm">{task.result}</p>}
      {task.error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{task.error}</p>}

      <h2 className="font-semibold">Steps</h2>
      {task.steps.length === 0 && <p className="text-sm text-gray-500">No tool calls.</p>}
      <ol className="space-y-3 border-l-2 border-gray-200 pl-4">
        {task.steps.map((s) => (
          <li key={s.id} className="space-y-1 rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono font-medium">#{s.stepIndex} {s.tool}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${statusColor[s.status] ?? statusColor.queued}`}>{s.status}</span>
            </div>
            <p className="text-xs text-gray-500">
              {new Date(s.startedAt).toLocaleTimeString()}
              {s.finishedAt && ` → ${new Date(s.finishedAt).toLocaleTimeString()}`}
              {s.externalId && ` · external id ${s.externalId}`}
            </p>
            {s.error && <p className="text-xs text-red-600">{s.error}</p>}
            <Json label="Input" value={s.input} />
            <Json label="Output" value={s.output} />
          </li>
        ))}
      </ol>
    </div>
  )
}
