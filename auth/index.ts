import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import GitHub from '@auth/core/providers/github'

export const authConfig = {
  providers: [GitHub],
} satisfies NextAuthConfig

export const { handlers, auth, signOut } = NextAuth(authConfig)
