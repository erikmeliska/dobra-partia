import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'

// GET: session auth → doklad scopovaný partiaId → stream private blobu.
export async function GET(request, { params }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doklad = await prisma.doklad.findFirst({
    where: { id, partiaId: session.user.partiaId },
  })
  if (!doklad?.fotoUrl) return NextResponse.json({ error: 'Nenájdené' }, { status: 404 })

  try {
    const blob = await get(doklad.fotoUrl, { access: 'private' })
    if (!blob?.stream) return NextResponse.json({ error: 'Nenájdené' }, { status: 404 })
    return new NextResponse(blob.stream, {
      headers: {
        'Content-Type': blob.blob.contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Nenájdené' }, { status: 404 })
  }
}
