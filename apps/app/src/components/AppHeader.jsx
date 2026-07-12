import Link from 'next/link'
import { signOut } from '@/auth'
import PushNastavenie from './PushNastavenie'

const SEKCIE = [
  { key: 'dopyty', href: '/dopyty', label: 'Dopyty' },
  { key: 'doklady', href: '/doklady', label: 'Doklady' },
]

export default function AppHeader({ aktivna }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-navy px-4 py-3 text-white">
      <nav className="flex gap-1">
        {SEKCIE.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${aktivna === s.key ? 'bg-white/20' : 'text-white/70'}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <PushNastavenie />
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <button type="submit" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
            Odhlásiť
          </button>
        </form>
      </div>
    </header>
  )
}
