'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import AgentAvatar from '@/components/AgentAvatar'
import Icon from '@/components/Icon'
import Logo from '@/components/Logo'
import TelegramLink from '@/components/TelegramLink'
import { api, type Me } from '@/lib/api'
import { btnPrimary, btnSecondary, card } from '@/lib/ui'

function Step({ icon, title, text, done, children }: { icon: string; title: string; text: string; done: boolean; children: ReactNode }) {
  return (
    <div className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
        <Icon name={done ? 'check' : icon} className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
      <div className="sm:max-w-xs">{children}</div>
    </div>
  )
}

/** Signup step 2: meet the agent, then connect apps. */
export default function WelcomePage() {
  const [me, setMe] = useState<Me>()

  useEffect(() => {
    api<Me>('/api/me').then(setMe)
  }, [])

  if (!me) return null
  const has = (provider: string) => me.integrations.some((i) => i.provider === provider)
  const agentName = me.agent?.name ?? 'your agent'

  return (
    <div className="bg-dots min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-slate-500">Step 2 of 2</span>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-full rounded-full bg-linear-to-r from-sky-500 to-purple-600" />
        </div>

        <div className="mt-12 flex flex-col items-center text-center">
          <AgentAvatar avatar={me.agent?.avatar} size="xl" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Hi{me.name ? ` ${me.name.split(' ')[0]}` : ''}, I'm {agentName}! 👋
          </h1>
          <p className="mt-2 max-w-md text-slate-600">
            Connect your apps so I can get to work. Start with Telegram, then add Google and Slack whenever you're ready.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <Step icon="chat" title="Chat with me on Telegram" text="Send instructions and get results right in your chat." done={me.telegramLinked}>
            <TelegramLink linked={me.telegramLinked} botUsername={me.botUsername} />
          </Step>
          <Step icon="sheet" title="Google Sheets & Calendar" text="Read your sheets and schedule meetings with Meet links." done={has('google')}>
            <a href="/api/oauth/google/start" className={has('google') ? btnSecondary : btnPrimary}>
              {has('google') ? 'Reconnect' : 'Connect Google'}
            </a>
          </Step>
          <Step icon="slack" title="Slack" text="Post updates and reports to channels you approve." done={has('slack')}>
            <a href="/api/oauth/slack/start" className={has('slack') ? btnSecondary : btnPrimary}>
              {has('slack') ? 'Reconnect' : 'Connect Slack'}
            </a>
          </Step>
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/dashboard" className={`${btnPrimary} px-6 py-3 text-base`}>
            Go to dashboard <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
