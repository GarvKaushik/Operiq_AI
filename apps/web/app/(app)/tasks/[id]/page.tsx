'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { card } from '@/lib/ui'

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

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  read_sheet: { label: 'Read Google Sheet', icon: 'sheet' },
  analyze_data: { label: 'Analyze data', icon: 'spark' },
  create_calendar_event: { label: 'Create calendar event', icon: 'calendar' },
  send_slack_message: { label: 'Post to Slack', icon: 'slack' },
  generate_report: { label: 'Generate report', icon: 'report' },
  list_files: { label: 'List files', icon: 'file' },
}

const DOT: Record<string, string> = {
  completed: 'bg-emerald-500 ring-emerald-100',
  failed: 'bg-rose-500 ring-rose-100',
  rejected: 'bg-rose-500 ring-rose-100',
  running: 'bg-sky-500 ring-sky-100',
  awaiting_confirmation: 'bg-amber-500 ring-amber-100',
}

function duration(step: Step) {
  if (!step.finishedAt) return ''
  const ms = new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

function Json({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  return (
    <details className="group text-xs">
      <summary className="cursor-pointer font-medium text-slate-500 select-none hover:text-slate-800">{label}</summary>
      <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 text-slate-100">{JSON.stringify(value, null, 2)}</pre>
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

  if (!task) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <Icon name="arrow" className="h-4 w-4 rotate-180" /> All tasks
      </Link>

      <div className={`${card} space-y-3 p-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={task.status} />
          <span className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleString()}</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">"{task.instruction}"</h1>
      </div>

      {task.result && (
        <div className={`${card} p-6`}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Result</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{task.result}</p>
        </div>
      )}
      {task.error && (
        <div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-700 ring-1 ring-rose-200">
          <p className="mb-1 font-semibold">Error</p>
          {task.error}
        </div>
      )}

      <div>
        <h2 className="mb-4 font-semibold">Steps</h2>
        {task.steps.length === 0 ? (
          <p className="text-sm text-slate-500">No tools were used for this task.</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
            {task.steps.map((s) => {
              const tool = TOOL_LABELS[s.tool] ?? { label: s.tool, icon: 'spark' }
              return (
                <li key={s.id} className="relative">
                  <span className={`absolute top-5 -left-[33px] h-3.5 w-3.5 rounded-full ring-4 ${DOT[s.status] ?? 'bg-slate-400 ring-slate-100'}`} />
                  <div className={`${card} space-y-3 p-4`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon name={tool.icon} className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                        <p className="font-mono text-xs text-slate-400">
                          #{s.stepIndex} · {s.tool}
                          {duration(s) && ` · ${duration(s)}`}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.externalId && (
                      <p className="text-xs text-slate-500">
                        External ID: <code className="rounded bg-slate-100 px-1.5 py-0.5">{s.externalId}</code>
                      </p>
                    )}
                    {s.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{s.error}</p>}
                    <div className="flex flex-col gap-2">
                      <Json label="Input" value={s.input} />
                      <Json label="Output" value={s.output} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
