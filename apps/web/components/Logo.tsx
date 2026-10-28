import Image from 'next/image'
import Link from 'next/link'

export default function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl bg-white shadow-md shadow-indigo-500/30" />
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Operiq</span>
    </Link>
  )
}
