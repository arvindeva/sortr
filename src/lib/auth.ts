import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueUsername } from "@/lib/username";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Link a Google sign-in to an existing user row by verified email.
      // Safe here: Google verifies email ownership, and our magic-link users
      // have no account rows to conflict with (Email provider never made any).
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async jwt({ token, user }) {
      // If user is signing in, add the user ID to the token
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to the session
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async createUser({ user: newUser }: { user: any }) {
      if (!newUser.username) {
        try {
          const username = await generateUniqueUsername();
          await db
            .update(user)
            .set({ username })
            .where(eq(user.id, newUser.id));
        } catch (error) {
          console.error("Failed to generate username:", error);
        }
      }
    },
  },
};
