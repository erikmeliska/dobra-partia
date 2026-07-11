import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Next.js 16's static export analysis only recognizes a plain `export const
// middleware = ...` (or `export { x as middleware }`) — a destructured
// `export const { auth: middleware } = NextAuth(authConfig)` is not detected
// and fails the build with "must export a function ... named middleware".
const { auth } = NextAuth(authConfig)
export const middleware = auth

export const config = {
  matcher: ['/((?!api/auth|api/notify|login|_next|sw\\.js|manifest|icons|favicon).*)'],
}
