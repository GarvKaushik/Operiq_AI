'use client'

import { useState } from 'react'
import AgentForm from '@/components/AgentForm'
import { useMe } from '@/lib/me'

export default function AgentPage() {
  const { me, reload } = useMe()
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My agent</h1>
        <p className="mt-1 text-slate-500">Change how your assistant looks and talks. Changes apply to new messages.</p>
      </div>
      {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">Saved</p>}
      <AgentForm
        initial={me.agent}
        submitLabel="Save changes"
        onSaved={async () => {
          await reload()
          setSaved(true)
        }}
      />
    </div>
  )
}
