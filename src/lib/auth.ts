import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { user } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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
      // Sign-in is ALL we use Google for. Scope down to openid+email so
      // Google never even sends name/photo — the provider default requested
      // the `profile` scope and next-auth's default mapping silently stored
      // profile.picture as user.image, making 12k users' real Google photos
      // their public sortr avatars (one user deleted their account over it).
      authorization: { params: { scope: "openid email" } },
      // Belt and braces: even if scopes ever drift, store identity as null —
      // sortr identity is the random username + deliberately-uploaded avatar.
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: null,
          image: null,
        };
      },
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
    // v4 leaves emailVerified NULL for OAuth-created users, which made the
    // 13k+ Google signups invisible to the admin growth charts (they key on
    // emailVerified as "completed signup at"). Google verifies the email, so
    // stamp it at link time; no-op for users already verified.
    async linkAccount({ user: linkedUser }: { user: any }) {
      try {
        await db
          .update(user)
          .set({ emailVerified: new Date() })
          .where(and(eq(user.id, linkedUser.id), isNull(user.emailVerified)));
      } catch (error) {
        console.error("Failed to stamp emailVerified on link:", error);
      }
    },
    async createUser({ user: newUser }: { user: any }) {
      // next-auth v4 fires this event even when an OAuth sign-in was LINKED to
      // an existing user (allowDangerousEmailAccountLinking), and the event's
      // user object is the bare AdapterUser — it never carries our custom
      // `username` column. Trusting it would regenerate (= clobber) the
      // username of every existing user who links Google. Check the real row.
      try {
        const [row] = await db
          .select({ username: user.username })
          .from(user)
          .where(eq(user.id, newUser.id));
        if (row && !row.username) {
          const username = await generateUniqueUsername();
          await db
            .update(user)
            .set({ username })
            .where(eq(user.id, newUser.id));
        }
      } catch (error) {
        console.error("Failed to generate username:", error);
      }
    },
  },
};
