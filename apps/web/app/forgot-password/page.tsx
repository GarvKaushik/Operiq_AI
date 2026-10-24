'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import AuthCard from '@/components/AuthCard'
import { api } from '@/lib/api'
import { btnPrimary, input, label } from '@/lib/ui'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api<{ message: string }>('/api/auth/forgot', {
        method: 'POST',
        body: { email: new FormData(e.currentTarget).get('email') },
      })
      setSent(res.message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll send a reset link to your linked Telegram chat.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {sent} Open Telegram and tap the link within 15 minutes.
          </p>
          <p className="text-sm text-slate-500">
            Never linked Telegram? You'll need the person who runs this app to reset it for you.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" name="email" type="email" required placeholder="you@company.com" className={input} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={busy} className={`${btnPrimary} w-full py-3`}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <Link href="/login" className="block text-center text-sm font-semibold text-indigo-600 hover:underline">
        Back to log in
      </Link>
    </AuthCard>
  )
}
