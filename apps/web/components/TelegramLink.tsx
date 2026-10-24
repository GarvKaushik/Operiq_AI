'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { btnPrimary, btnSecondary } from '@/lib/ui'

/** Creates a one-time link (10 min) that connects the user's Telegram chat to their account. */
export default function TelegramLink({ linked, botUsername }: { linked: boolean; botUsername: string }) {
  const [url, setUrl] = useState('')
  const token = url.split('start=')[1]

  async function create() {
    setUrl((await api<{ url: string }>('/api/telegram/link', { method: 'POST' })).url)
  }

  return (
    <div className="space-y-3">
      <button onClick={create} className={linked ? btnSecondary : btnPrimary}>
        {linked ? 'Link another chat' : 'Link Telegram'}
      </button>
      {url && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
          <p>
            <a href={url} target="_blank" className="font-medium text-indigo-600 underline underline-offset-2">
              Open the bot
            </a>{' '}
            within 10 minutes and press <b>Start</b>.
          </p>
          <p className="text-slate-600">
            Link blocked? In Telegram, search for{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold ring-1 ring-slate-200">@{botUsername}</code>, open it and
            send:{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200">/start {token}</code>
          </p>
          <p className="text-xs text-slate-500">Don't share this link: whoever opens it first links their chat to your account.</p>
        </div>
      )}
    </div>
  )
}
