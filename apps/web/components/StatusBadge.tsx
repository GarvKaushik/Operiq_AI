import { statusStyle } from '@/lib/api'

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyle[status] ?? statusStyle.queued
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'running' ? 'animate-pulse' : ''}`} />
      {style.label}
    </span>
  )
}
