import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

async function prihlasit(formData) {
  'use server'
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dopyty',
    })
  } catch (e) {
    if (e instanceof AuthError) redirect('/login?chyba=1')
    throw e
  }
}

export default async function LoginPage({ searchParams }) {
  const { chyba } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={prihlasit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Dobrá Partia</h1>
        {chyba && (
          <p className="rounded-lg bg-terracotta/10 p-3 text-center text-terracotta">
            Nesprávny e-mail alebo heslo
          </p>
        )}
        <input
          name="email" type="email" required placeholder="E-mail" autoComplete="email"
          className="w-full rounded-xl border border-navy/20 bg-white p-4 text-lg"
        />
        <input
          name="password" type="password" required placeholder="Heslo" autoComplete="current-password"
          className="w-full rounded-xl border border-navy/20 bg-white p-4 text-lg"
        />
        <button type="submit" className="w-full rounded-xl bg-navy p-4 text-lg font-bold text-white">
          Prihlásiť sa
        </button>
      </form>
    </main>
  )
}
