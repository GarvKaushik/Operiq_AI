export const AVATARS = [
  { id: 'businesswoman', emoji: '👩🏽‍💼', bg: 'from-fuchsia-500 to-violet-600' },
  { id: 'businessman', emoji: '👨🏽‍💼', bg: 'from-sky-500 to-indigo-600' },
  { id: 'robot', emoji: '🤖', bg: 'from-slate-600 to-slate-900' },
  { id: 'owl', emoji: '🦉', bg: 'from-amber-400 to-orange-600' },
  { id: 'rocket', emoji: '🚀', bg: 'from-rose-500 to-red-600' },
  { id: 'spark', emoji: '✨', bg: 'from-emerald-400 to-teal-600' },
  { id: 'brain', emoji: '🧠', bg: 'from-pink-400 to-rose-500' },
  { id: 'globe', emoji: '🌐', bg: 'from-cyan-400 to-blue-600' },
]

export const PERSONALITIES = [
  { label: 'Friendly', text: 'Warm, friendly and encouraging. Uses simple, clear words.' },
  { label: 'Professional', text: 'Formal, precise and to the point.' },
  { label: 'Concise', text: 'Very brief. Short sentences, no small talk.' },
  { label: 'Cheerful', text: 'Upbeat and positive, with the occasional emoji.' },
]

export function avatarFor(id?: string | null) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}
