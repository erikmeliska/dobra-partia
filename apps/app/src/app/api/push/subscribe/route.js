import { NextResponse } from 'next/server'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'

export async function POST(request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sub = await request.json()
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Neplatná subscription' }, { status: 400 })
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, uzivatelId: session.user.id },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      uzivatelId: session.user.id,
    },
  })
  return NextResponse.json({ ok: true })
}
