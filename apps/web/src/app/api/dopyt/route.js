import { NextResponse } from 'next/server'
import { verifyWpAuth } from '@/lib/wp-auth'
import { createDopyt } from '@/lib/dopyt'

export async function POST(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Neplatný formát' }, { status: 400 })
  }
  const { success, message, status } = await createDopyt(body)
  return NextResponse.json({ success, message }, { status })
}
