'use client'

import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { useMe } from '@/lib/me'
import { btnPrimary, card, input, label } from '@/lib/ui'

export default function AccountPage() {
  const { me } = useMe()
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()
  const [busy, setBusy] = useState(false)

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    if (form.get('newPassword') !== form.get('confirm')) return setMessage({ ok: false, text: 'New passwords do not match' })
    setBusy(true)
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') },
      })
      formEl.reset()
      setMessage({ ok: true, text: 'Password changed. Other devices have been logged out.' })
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-slate-500">Your login details.</p>
      </div>

      <section className={`${card} p-6`}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Name</dt>
            <dd className="font-medium">{me.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="font-medium">{me.email}</dd>
          </div>
        </dl>
      </section>

      <section className={`${card} max-w-lg space-y-4 p-6`}>
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className={label}>Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required className={input} />
          </div>
          <div>
            <label htmlFor="newPassword" className={label}>New password</label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} className={input} />
          </div>
          <div>
            <label htmlFor="confirm" className={label}>Confirm new password</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} className={input} />
          </div>
          {message && (
            <p className={`rounded-lg px-3 py-2 text-sm ring-1 ${message.ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
              {message.text}
            </p>
          )}
          <button disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
      </section>
    </div>
  )
}
