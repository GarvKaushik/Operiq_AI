'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Icon from '@/components/Icon'
import Logo from '@/components/Logo'
import { api, type Me } from '@/lib/api'
import { btnPrimary, input, label } from '@/lib/ui'

const PERKS = ['Reports with charts from your sheets', 'Meetings with Google Meet links', 'Slack updates, only to approved channels']

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setMode('register')
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setBusy(true)
    try {
      await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: { name: form.get('name') ?? undefined, email: form.get('email'), password: form.get('password') },
      })
      const me = await api<Me>('/api/me')
      window.location.href = me.agent ? '/dashboard' : '/onboarding'
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const registering = mode === 'register'

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-sky-500 via-indigo-500 to-purple-600 p-12 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="my-auto max-w-md space-y-6">
          <h2 className="text-4xl font-bold leading-tight">Your business assistant, one message away.</h2>
          <ul className="space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-indigo-50">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      </aside>

      <main className="bg-dots flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{registering ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {registering ? 'Set up your AI agent in under two minutes.' : 'Log in to your dashboard.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {registering && (
              <div>
                <label htmlFor="name" className={label}>Your name</label>
                <input id="name" name="name" required maxLength={60} placeholder="Your full name" className={input} />
              </div>
            )}
            <div>
              <label htmlFor="email" className={label}>Email</label>
              <input id="email" name="email" type="email" required placeholder="you@company.com" className={input} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={label}>Password</label>
                {!registering && (
                  <a href="/forgot-password" className="mb-1.5 text-sm font-medium text-indigo-600 hover:underline">Reset password using Telegram?</a>
                )}
              </div>
              <input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" className={input} />
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
            <button disabled={busy} className={`${btnPrimary} w-full py-3`}>
              {busy ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            {registering ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(registering ? 'login' : 'register')
                setError('')
              }}
              className="font-semibold text-indigo-600 hover:underline"
            >
              {registering ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
