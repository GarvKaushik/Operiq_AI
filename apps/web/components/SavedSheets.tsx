'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

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
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm text-gray-600">
        Saved sheets. Say <i>"summarize my sales sheet"</i> in chat instead of pasting IDs.
      </p>
      <form onSubmit={save} className="flex flex-wrap gap-2">
        <input name="name" required placeholder="Name, e.g. sales" className="w-36 rounded border px-2 py-1 text-sm" />
        <input name="link" required placeholder="Google Sheet link" className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
        <button disabled={saving} className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50">
          {saving ? 'Checking…' : 'Save'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-1">
        {sheets.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{s.name}</span>
            <span className="truncate text-gray-500">→ {s.title}</span>
            {s.isDefault ? (
              <span className="text-amber-600">★ default</span>
            ) : (
              <button onClick={() => makeDefault(s.id)} className="text-xs text-indigo-600 underline">
                make default
              </button>
            )}
            <button onClick={() => remove(s.id)} className="ml-auto text-xs text-red-600 underline">
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
