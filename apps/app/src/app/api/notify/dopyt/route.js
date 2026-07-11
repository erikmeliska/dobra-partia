import { NextResponse } from 'next/server'
import { sendPushAll } from '../../../../lib/push'

export async function POST(request) {
  const token = request.headers.get('x-internal-token')
  if (!token || token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { meno, sluzba, adresa } = await request.json()
  const result = await sendPushAll({
    title: `Nový dopyt: ${sluzba || 'neuvedená služba'}`,
    body: `${meno || ''} — ${adresa || ''}`,
    url: '/dopyty',
  })
  return NextResponse.json({ ok: true, ...result })
}
