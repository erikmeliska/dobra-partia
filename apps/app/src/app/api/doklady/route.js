import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { decodeQrZBuffra } from '../../../lib/qr-server'
import { spracujDoklad } from '../../../lib/pipeline'

export const maxDuration = 60

export async function POST(request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const partiaId = session.user.partiaId

  const form = await request.formData()
  const foto = form.get('foto')
  if (!foto || typeof foto.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Chýba fotka' }, { status: 400 })
  }
  const buffer = Buffer.from(await foto.arrayBuffer())

  let qrText = (form.get('qrText') || '').toString()
  if (!qrText) qrText = (await decodeQrZBuffra(buffer)) || ''

  if (qrText) {
    const existujuci = await prisma.doklad.findFirst({ where: { partiaId, qrData: qrText } })
    if (existujuci) return NextResponse.json({ duplicita: true, dokladId: existujuci.id })
  }

  const blob = await put(`doklady/${partiaId}/${Date.now()}.jpg`, buffer, {
    access: 'private',
    addRandomSuffix: true,
    contentType: foto.type || 'image/jpeg',
  })

  const doklad = await prisma.doklad.create({
    data: { partiaId, stav: 'inbox', qrData: qrText, fotoUrl: blob.url },
  })

  const spracovany = await spracujDoklad(doklad.id)
  return NextResponse.json({
    dokladId: spracovany?.id || doklad.id,
    stav: spracovany?.stav || 'inbox',
    ...(spracovany?.duplicita ? { duplicita: true } : {}),
  })
}
