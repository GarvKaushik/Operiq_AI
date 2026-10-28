import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Operiq: Smart operations, from your chat',
  description: 'Analyze sheets, create reports, schedule meetings and post to Slack, just by chatting.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
