// Shared Tailwind class sets so every page looks consistent.

export const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${buttonBase} bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:brightness-110`

export const btnSecondary = `${buttonBase} border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50`

export const input =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'

export const label = 'mb-1.5 block text-sm font-medium text-slate-700'

export const gradientText = 'bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent'
