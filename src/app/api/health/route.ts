import { db } from "@/db";
import { sql } from "drizzle-orm";

// Railway healthcheck target (Settings → Deploy → Healthcheck Path). Gates
// deploys — a replica only receives traffic once this returns 200 — so it
// must prove the app can actually serve, not just that the process is up:
// a SELECT 1 catches bad DATABASE_URL, exhausted pool, and dead DB.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
