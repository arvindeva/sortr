import { db } from "@/db";
import { sortProgress, sorters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// Cap on the stored blob — a sane upper bound; even a huge sort compresses to
// well under this. Rejects anything absurd (abuse / corruption).
const MAX_STATE_LEN = 2_000_000; // ~2MB of compressed text

// POST /api/sort-progress — upsert the logged-in user's in-progress sort for a
// sorter. One row per (user, sorter); newest write wins. Anonymous users get a
// 401 (they stay on localStorage-only).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const sorterId = typeof body?.sorterId === "string" ? body.sorterId : "";
    const state = typeof body?.state === "string" ? body.state : "";
    const itemCount =
      typeof body?.itemCount === "number" ? body.itemCount : 0;

    if (!sorterId || !state) {
      return Response.json(
        { error: "Missing sorterId or state" },
        { status: 400 },
      );
    }
    if (state.length > MAX_STATE_LEN) {
      return Response.json({ error: "State too large" }, { status: 413 });
    }

    // Pin to the current sorter version (for later mismatch detection).
    const [sorter] = await db
      .select({ version: sorters.version })
      .from(sorters)
      .where(eq(sorters.id, sorterId))
      .limit(1);
    if (!sorter) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    const now = new Date();
    await db
      .insert(sortProgress)
      .values({
        userId,
        sorterId,
        version: sorter.version,
        state,
        itemCount,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sortProgress.userId, sortProgress.sorterId],
        set: { state, itemCount, version: sorter.version, updatedAt: now },
      });

    return Response.json({ ok: true, updatedAt: now.toISOString() });
  } catch (error) {
    console.error("Error saving sort progress:", error);
    return Response.json(
      { error: "Failed to save progress" },
      { status: 500 },
    );
  }
}
