import { notFound } from 'next/navigation'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import AppHeader from '@/components/AppHeader'
import DokladDetail from '@/components/DokladDetail'

export const dynamic = 'force-dynamic'

export default async function DokladDetailPage({ params }) {
  const session = await auth()
  const { id } = await params
  const doklad = await prisma.doklad.findFirst({
    where: { id, partiaId: session.user.partiaId },
    include: { polozky: true },
  })
  if (!doklad) notFound()
  return (
    <>
      <AppHeader aktivna="doklady" />
      <main className="mx-auto max-w-xl space-y-4 p-4 pb-28">
        <DokladDetail
          doklad={{
            ...doklad,
            suma: doklad.suma != null ? Number(doklad.suma) : null,
            polozky: doklad.polozky.map((p) => ({
              id: p.id,
              nazov: p.nazov,
              mnozstvo: Number(p.mnozstvo),
              suma: Number(p.suma),
              jednotkovaCena: p.jednotkovaCena != null ? Number(p.jednotkovaCena) : null,
            })),
          }}
        />
      </main>
    </>
  )
}
