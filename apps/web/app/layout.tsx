import Link from 'next/link'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = { title: 'Business Assistant' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl gap-6 px-4 py-3 text-sm font-medium">
            <Link href="/">Integrations</Link>
            <Link href="/tasks">Tasks</Link>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
