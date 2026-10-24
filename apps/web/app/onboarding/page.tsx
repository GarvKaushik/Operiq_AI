'use client'

import { useEffect, useState } from 'react'
import AgentForm from '@/components/AgentForm'
import Logo from '@/components/Logo'
import { api, type Me } from '@/lib/api'

/** Signup step 1: choose the agent's avatar, name and personality. */
export default function OnboardingPage() {
  const [me, setMe] = useState<Me>()

  useEffect(() => {
    api<Me>('/api/me').then(setMe)
  }, [])

  if (!me) return null

  return (
    <div className="bg-dots min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-slate-500">Step 1 of 2</span>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 rounded-full bg-linear-to-r from-indigo-600 to-violet-600" />
        </div>

        <div className="mt-10 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {me.name ? `Hi ${me.name.split(' ')[0]}, let's` : "Let's"} create your AI agent
          </h1>
          <p className="mt-2 text-slate-600">Choose how your assistant looks and talks. You can change this anytime.</p>
        </div>

        <AgentForm initial={me.agent} submitLabel="Continue" onSaved={() => (window.location.href = '/welcome')} />
      </div>
    </div>
  )
}
