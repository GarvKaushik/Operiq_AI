import { avatarFor } from '@/lib/avatars'

const SIZES = {
  sm: 'h-9 w-9 text-lg',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-20 w-20 text-4xl',
  xl: 'h-28 w-28 text-6xl',
}

export default function AgentAvatar({ avatar, size = 'md' }: { avatar?: string | null; size?: keyof typeof SIZES }) {
  const a = avatarFor(avatar)
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br ${a.bg} ${SIZES[size]} shadow-lg ring-4 ring-white`}>
      <span aria-hidden>{a.emoji}</span>
    </div>
  )
}
