import prisma from '@dobra-partia/db'
import AppHeader from '@/components/AppHeader'
import DopytKarta from '@/components/DopytKarta'
import { STAVY_DOPYTU, STAV_LABEL, jePlatnyStav } from '@/lib/dopyty'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DopytyPage({ searchParams }) {
  const { stav } = await searchParams
  const filter = jePlatnyStav(stav) ? { stav } : {}
  const dopyty = await prisma.dopyt.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    <>
      <AppHeader title="Dopyty" />
      <main className="mx-auto max-w-xl space-y-3 p-4">
        <nav className="flex gap-2">
          <Link href="/dopyty" className={`rounded-full px-4 py-2 text-sm font-bold ${!stav ? 'bg-navy text-white' : 'bg-white'}`}>
            Všetky
          </Link>
          {STAVY_DOPYTU.map((s) => (
            <Link
              key={s}
              href={`/dopyty?stav=${s}`}
              className={`rounded-full px-4 py-2 text-sm font-bold ${stav === s ? 'bg-navy text-white' : 'bg-white'}`}
            >
              {STAV_LABEL[s]}
            </Link>
          ))}
        </nav>
        {dopyty.length === 0 && <p className="p-6 text-center text-navy/50">Žiadne dopyty</p>}
        {dopyty.map((d) => (
          <DopytKarta key={d.id} dopyt={d} />
        ))}
      </main>
    </>
  )
}
