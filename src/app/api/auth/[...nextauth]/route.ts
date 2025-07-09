import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueUsername } from "@/lib/username";

const authOptions = {
    providers: [
        EmailProvider({
            server: process.env.EMAIL_SERVER!,
            from: process.env.EMAIL_FROM!,
        }),
    ],
    adapter: DrizzleAdapter(db),
    session: { strategy: "jwt" as const },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
    },
    events: {
        async createUser({ user: newUser }) {
            if (!newUser.username) {
                try {
                    const username = await generateUniqueUsername();
                    await db.update(user).set({ username }).where(eq(user.id, newUser.id));
                } catch (error) {
                    console.error("Failed to generate username:", error);
                }
            }
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
