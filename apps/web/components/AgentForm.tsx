'use client'

import { useState, type FormEvent } from 'react'
import { api, type Agent } from '@/lib/api'
import { AVATARS, PERSONALITIES } from '@/lib/avatars'
import { btnPrimary, card, input, label } from '@/lib/ui'
import AgentAvatar from './AgentAvatar'

type Props = { initial?: Agent | null; submitLabel: string; onSaved: () => void }

/** Pick avatar, name and personality, with a live preview of the agent. */
export default function AgentForm({ initial, submitLabel, onSaved }: Props) {
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0].id)
  const [name, setName] = useState(initial?.name ?? 'Riya')
  const [personality, setPersonality] = useState(initial?.personality ?? PERSONALITIES[0].text)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api('/api/agent', { method: 'PUT', body: { name, avatar, personality } })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className={`${card} space-y-6 p-6`}>
        <div>
          <span className={label}>Avatar</span>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatar(a.id)}
                className={`grid place-items-center rounded-2xl p-2 transition ${
                  avatar === a.id ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'hover:bg-slate-50'
                }`}
                aria-label={a.id}
              >
                <AgentAvatar avatar={a.id} size="sm" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="agent-name" className={label}>Agent name</label>
          <input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required className={input} />
        </div>

        <div>
          <span className={label}>Personality</span>
          <div className="mb-3 flex flex-wrap gap-2">
            {PERSONALITIES.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPersonality(p.text)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 transition ${
                  personality === p.text ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Optional: describe how your agent should talk"
            className={input}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </form>

      {/* Live preview */}
      <div className={`${card} flex flex-col items-center gap-4 bg-linear-to-b from-indigo-50 to-white p-6 text-center`}>
        <span className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Preview</span>
        <AgentAvatar avatar={avatar} size="xl" />
        <div>
          <p className="text-xl font-bold text-slate-900">{name || 'Your agent'}</p>
          <p className="text-sm text-slate-500">Your personal AI business assistant</p>
        </div>
        <div className="w-full rounded-2xl rounded-tl-sm bg-white p-3 text-left text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
          Hi! I'm {name || 'your agent'}. Send me a sheet or a CSV and I'll turn it into a report with charts.
        </div>
        {personality && <p className="text-xs text-slate-500 italic">"{personality}"</p>}
      </div>
    </div>
  )
}
