'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import AgentAvatar from '@/components/AgentAvatar'
import Icon from '@/components/Icon'
import Logo from '@/components/Logo'
import { api, type Me } from '@/lib/api'
import { MeContext } from '@/lib/me'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/agent', label: 'My agent', icon: 'agent' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { href: '/account', label: 'Account', icon: 'shield' },
]

/** Sidebar layout for logged-in pages. Sends users without an agent to onboarding. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [me, setMe] = useState<Me>()

  const reload = useCallback(async () => {
    const data = await api<Me>('/api/me')
    if (!data.agent) window.location.href = '/onboarding'
    else setMe(data)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (!me) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Loading…</div>
  }

  return (
    <MeContext.Provider value={{ me, reload }}>
      <div className="min-h-screen lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-5 py-4">
            <Logo href="/dashboard" />
            <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-800 lg:hidden">
              Log out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto hidden border-t border-slate-100 p-4 lg:block">
            <div className="flex items-center gap-3">
              <AgentAvatar avatar={me.agent?.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{me.agent?.name}</p>
                <p className="truncate text-xs text-slate-500">{me.email}</p>
              </div>
              <button onClick={logout} title="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:pl-64">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</div>
        </main>
      </div>
    </MeContext.Provider>
  )
}
