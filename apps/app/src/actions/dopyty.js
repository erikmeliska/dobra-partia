'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { jePlatnyStav } from '@/lib/dopyty'

export async function zmenStavDopytu(id, stav) {
  const session = await auth()
  if (!session?.user) throw new Error('Neprihlásený')
  if (!jePlatnyStav(stav)) throw new Error('Neplatný stav')
  await prisma.dopyt.update({
    where: { id },
    data: { stav, vybavene: stav === 'dokonceny' },
  })
  revalidatePath('/dopyty')
}
