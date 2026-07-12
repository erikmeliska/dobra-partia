import Link from 'next/link'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import AppHeader from '@/components/AppHeader'
import DokladKarta from '@/components/DokladKarta'
import { STAVY_DOKLADU, STAV_DOKLADU_LABEL, jePlatnyStavDokladu } from '@/lib/doklady-ui'

export const dynamic = 'force-dynamic'

export default async function DokladyPage({ searchParams }) {
  const session = await auth()
  const { stav } = await searchParams
  const filter = jePlatnyStavDokladu(stav) ? { stav } : {}
  const doklady = await prisma.doklad.findMany({
    where: { partiaId: session.user.partiaId, ...filter },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    <>
      <AppHeader aktivna="doklady" />
      <main className="mx-auto max-w-xl space-y-3 p-4 pb-28">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href="/doklady"
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${!stav ? 'bg-navy text-white' : 'bg-white'}`}
          >
            Všetky
          </Link>
          {STAVY_DOKLADU.map((s) => (
            <Link
              key={s}
              href={`/doklady?stav=${s}`}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${stav === s ? 'bg-navy text-white' : 'bg-white'}`}
            >
              {STAV_DOKLADU_LABEL[s]}
            </Link>
          ))}
        </nav>
        {doklady.length === 0 && (
          <p className="p-6 text-center text-navy/50">Žiadne doklady — odfoť prvý bloček 📷</p>
        )}
        {doklady.map((d) => (
          <DokladKarta key={d.id} doklad={d} />
        ))}
      </main>
    </>
  )
}
