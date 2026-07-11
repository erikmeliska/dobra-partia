export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
    jwt({ token, user }) {
      if (user) {
        token.partiaId = user.partiaId
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.partiaId = token.partiaId
      session.user.id = token.id ?? token.sub
      return session
    },
  },
  providers: [],
}
