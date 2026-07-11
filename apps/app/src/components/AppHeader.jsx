import { signOut } from '@/auth'

export default function AppHeader({ title }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-navy px-4 py-3 text-white">
      <h1 className="text-lg font-bold">{title}</h1>
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
    </header>
  )
}
