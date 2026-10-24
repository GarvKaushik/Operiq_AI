'use client'

import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    try {
      await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      })
      window.location.href = '/'
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <input name="email" type="email" required placeholder="Email" className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded bg-indigo-600 py-2 font-medium text-white">
        {mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
      <button type="button" className="w-full text-sm text-indigo-600" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
      </button>
    </form>
  )
}
