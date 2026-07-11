import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import prisma from '@dobra-partia/db'
import { authConfig } from './auth.config'
import { verifyCredentials } from './lib/auth-helpers'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        return verifyCredentials(prisma, creds?.email, creds?.password)
      },
    }),
  ],
})
