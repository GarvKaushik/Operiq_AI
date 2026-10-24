'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import Logo from '@/components/Logo'
import { btnPrimary, btnSecondary, card, gradientText } from '@/lib/ui'

const FEATURES = [
  { icon: 'sheet', title: 'Analyze Google Sheets', text: 'Totals, growth, profit and group breakdowns, all calculated exactly in code.' },
  { icon: 'report', title: 'Reports with charts', text: 'A summary card in the chat and a polished PDF report with a secure link.' },
  { icon: 'calendar', title: 'Schedule meetings', text: 'Create Google Calendar events with a Meet link and invite your team.' },
  { icon: 'slack', title: 'Post to Slack', text: 'Share updates and reports, only to channels you have approved.' },
  { icon: 'shield', title: 'Safe by design', text: 'Asks before acting, encrypted credentials, never repeats an action twice.' },
  { icon: 'tasks', title: 'Full audit trail', text: 'Every task and every step is recorded and visible in your dashboard.' },
] as const

const STEPS = [
  { title: 'Create your agent', text: 'Pick an avatar, a name and a personality.' },
  { title: 'Connect your apps', text: 'Link your chat, Google and Slack in a few clicks.' },
  { title: 'Just chat', text: 'Send an instruction. Your agent does the work and replies with results.' },
]

/** Illustrative chat (sample data) showing what the assistant does. */
function ChatPreview() {
  return (
    <div className={`${card} relative w-full max-w-md overflow-hidden p-0 shadow-xl shadow-indigo-500/10`}>
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-fuchsia-500 to-violet-600 text-lg">👩🏽‍💼</div>
        <div>
          <p className="text-sm font-semibold">Riya</p>
          <p className="text-xs text-emerald-600">online</p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Sample</span>
      </div>
      <div className="space-y-3 bg-slate-50 p-4 text-sm">
        <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-white">
          Analyze my sales sheet and make a report with graphs
        </p>
        <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          Done! Revenue is up 18.4%, with North leading. Here's your report 👇
        </p>
        <div className="w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold">Sales Performance Report</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[['Revenue', '4,85,000'], ['Orders', '248'], ['Growth', '+18.4%']].map(([k, v]) => (
              <div key={k} className={`rounded-lg p-2 ${k === 'Growth' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50'}`}>
                <p className="text-[10px] text-slate-500">{k}</p>
                <p className="text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-20 items-end gap-2">
            {[55, 62, 74, 88].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-linear-to-t from-indigo-600 to-violet-400" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <p className="w-fit rounded-xl bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-slate-200">📄 Sales Performance Report.pdf</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((res) => setLoggedIn(res.ok)).catch(() => {})
  }, [])

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard" className={btnPrimary}>Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900">Log in</Link>
                <Link href="/login?mode=register" className={btnPrimary}>Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-dots relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-0 h-96 bg-linear-to-b from-indigo-50/80 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <Icon name="spark" className="h-3.5 w-3.5" /> Your AI business assistant
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Run your business <span className={gradientText}>by chatting</span>
            </h1>
            <p className="max-w-lg text-lg text-slate-600">
              Send one message. Your agent analyzes your sheets, builds reports with charts, schedules meetings and
              updates your team on Slack, with every step recorded.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={loggedIn ? '/dashboard' : '/login?mode=register'} className={`${btnPrimary} px-6 py-3 text-base`}>
                {loggedIn ? 'Open dashboard' : 'Create your agent'} <Icon name="arrow" className="h-4 w-4" />
              </Link>
              {!loggedIn && <Link href="/login" className={`${btnSecondary} px-6 py-3 text-base`}>Log in</Link>}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ChatPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">Everything your team asks for, done</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">Real integrations, real results. No copy-pasting between apps.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`${card} p-6 transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon name={f.icon} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Up and running in minutes</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`${card} p-6`}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-linear-to-br from-indigo-600 to-violet-700 px-8 py-14 text-center text-white shadow-xl shadow-indigo-500/20">
          <h2 className="text-3xl font-bold tracking-tight">Meet your new teammate</h2>
          <p className="mx-auto mt-3 max-w-md text-indigo-100">Create your agent and send your first instruction today.</p>
          <Link href={loggedIn ? '/dashboard' : '/login?mode=register'} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50">
            Get started free <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Byizon
      </footer>
    </div>
  )
}
