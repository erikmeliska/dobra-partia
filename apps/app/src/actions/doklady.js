'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { del } from '@vercel/blob'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { spracujDoklad } from '@/lib/pipeline'
import { validujUpravu } from '@/lib/doklady'

async function najdiVlastny(id) {
  const session = await auth()
  if (!session?.user) throw new Error('Neprihlásený')
  const doklad = await prisma.doklad.findFirst({
    where: { id, partiaId: session.user.partiaId },
  })
  if (!doklad) throw new Error('Doklad neexistuje')
  return doklad
}

export async function overitDoklad(id) {
  const doklad = await najdiVlastny(id)
  if (!['inbox', 'rucne'].includes(doklad.stav)) return
  await spracujDoklad(doklad.id)
  revalidatePath(`/doklady/${id}`)
  revalidatePath('/doklady')
}

export async function upravDoklad(id, hodnoty) {
  await najdiVlastny(id)
  const v = validujUpravu(hodnoty)
  if (!v.ok) throw new Error(v.chyba)
  await prisma.doklad.update({
    where: { id },
    // ručný zásah = dáta už nie sú autoritatívne z eKasa
    data: { ...v.data, stav: 'spracovany', overenie: 'nic' },
  })
  revalidatePath(`/doklady/${id}`)
  revalidatePath('/doklady')
}

export async function zmazDoklad(id) {
  const doklad = await najdiVlastny(id)
  if (doklad.fotoUrl) await del(doklad.fotoUrl).catch(() => {})
  await prisma.$transaction([
    prisma.nakladovaPolozka.deleteMany({ where: { dokladId: id } }),
    prisma.doklad.delete({ where: { id } }),
  ])
  revalidatePath('/doklady')
  redirect('/doklady')
}
