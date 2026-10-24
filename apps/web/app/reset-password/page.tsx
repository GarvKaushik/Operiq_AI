'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import AuthCard from '@/components/AuthCard'
import { api } from '@/lib/api'
import { btnPrimary, input, label } from '@/lib/ui'

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (form.get('password') !== form.get('confirm')) return setError('Passwords do not match')
    setError('')
    setBusy(true)
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password: form.get('password') } })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="You've been logged out on all devices for safety.">
        <Link href="/login" className={`${btnPrimary} w-full py-3`}>Log in with your new password</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose a password with at least 8 characters.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className={label}>New password</label>
          <input id="password" name="password" type="password" required minLength={8} className={input} />
        </div>
        <div>
          <label htmlFor="confirm" className={label}>Confirm password</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} className={input} />
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
        <button disabled={busy || !token} className={`${btnPrimary} w-full py-3`}>{busy ? 'Saving…' : 'Update password'}</button>
        {!token && <p className="text-sm text-rose-600">This page needs the link from your Telegram message.</p>}
      </form>
    </AuthCard>
  )
}
