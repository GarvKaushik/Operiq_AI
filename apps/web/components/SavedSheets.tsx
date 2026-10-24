'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { btnPrimary, input } from '@/lib/ui'

type Sheet = { id: string; name: string; title: string | null; isDefault: boolean }

/** Save Google Sheets under short names so chat can say "my sales sheet". */
export default function SavedSheets() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => api<Sheet[]>('/api/sheets').then(setSheets)

  useEffect(() => {
    load()
  }, [])

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setError('')
    setSaving(true)
    try {
      await api('/api/sheets', { method: 'POST', body: { name: form.get('name'), link: form.get('link') } })
      formEl.reset()
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function makeDefault(id: string) {
    await api(`/api/sheets/${id}/default`, { method: 'PUT' })
    await load()
  }

  async function remove(id: string) {
    await api(`/api/sheets/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Saved sheets</p>
        <p className="text-sm text-slate-500">
          Say <i>"summarize my sales sheet"</i> in chat instead of pasting links.
        </p>
      </div>
      <form onSubmit={save} className="flex flex-wrap gap-2">
        <input name="name" required placeholder="Name, e.g. sales" className={`${input} w-40`} />
        <input name="link" required placeholder="Google Sheet link" className={`${input} min-w-0 flex-1`} />
        <button disabled={saving} className={btnPrimary}>
          {saving ? 'Checking…' : 'Save'}
        </button>
      </form>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 empty:hidden">
        {sheets.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-medium text-emerald-700">{s.name}</span>
            <span className="truncate text-slate-600">{s.title}</span>
            {s.isDefault ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">★ default</span>
            ) : (
              <button onClick={() => makeDefault(s.id)} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
                Make default
              </button>
            )}
            <button onClick={() => remove(s.id)} className="ml-auto shrink-0 text-xs font-medium text-slate-400 hover:text-rose-600">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
