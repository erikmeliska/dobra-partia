import { NextResponse } from 'next/server'

export function verifyWpAuth(request) {
  const auth = request.headers.get('authorization')
  if (!auth) {
    return NextResponse.json(
      { code: 'rest_not_logged_in', message: 'You are not currently logged in.' },
      { status: 401 }
    )
  }

  // Support WP_AUTH (pre-encoded base64) or WP_USERNAME:WP_PASSWORD
  const validTokens = []

  if (process.env.WP_AUTH) {
    validTokens.push('Basic ' + process.env.WP_AUTH)
  }

  if (process.env.WP_USERNAME && process.env.WP_PASSWORD) {
    validTokens.push(
      'Basic ' + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_PASSWORD}`).toString('base64')
    )
  }

  if (!validTokens.some(token => auth === token)) {
    return NextResponse.json(
      { code: 'rest_forbidden', message: 'Invalid credentials.' },
      { status: 403 }
    )
  }

  return null // auth OK
}
