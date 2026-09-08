import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Admin user ids come from the ADMIN_USER_ID env var (comma-separated), set
// per-environment so dev and prod use their own ids. No ids → no admins.
export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  const allow = (process.env.ADMIN_USER_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(userId);
}

/** Session-based admin check for API routes. Returns the admin's user id, or null. */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return isAdmin(userId) ? (userId as string) : null;
}
