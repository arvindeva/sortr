import { db } from "@/db";
import { sortProgress, sorters } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// Cap on the stored blob — a sane upper bound; even a huge sort compresses to
// well under this. Rejects anything absurd (abuse / corruption).
const MAX_STATE_LEN = 2_000_000; // ~2MB of compressed text

// In-progress sorts untouched for this long are considered abandoned and lazily
// cleaned up (no cron — pruned when the user lists their in-progress sorts).
const TTL_DAYS = 30;

// GET /api/sort-progress — list the current user's in-progress sorts (for the
// profile "In progress" section). Private to the user. Excludes the heavy
// state blob; just enough to render a card + resume link.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ inProgress: [] });

  // Lazy TTL prune of this user's abandoned sorts (keeps the table small
  // without a scheduled job).
  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000);
  await db
    .delete(sortProgress)
    .where(
      and(eq(sortProgress.userId, userId), lt(sortProgress.updatedAt, cutoff)),
    );

  const rows = await db
    .select({
      sorterId: sortProgress.sorterId,
      itemCount: sortProgress.itemCount,
      updatedAt: sortProgress.updatedAt,
      version: sortProgress.version,
      title: sorters.title,
      slug: sorters.slug,
      coverImageUrl: sorters.coverImageUrl,
      category: sorters.category,
      completionCount: sorters.completionCount,
      deleted: sorters.deleted,
      sorterVersion: sorters.version,
    })
    .from(sortProgress)
    .innerJoin(sorters, eq(sortProgress.sorterId, sorters.id))
    .where(and(eq(sortProgress.userId, userId), eq(sorters.deleted, false)))
    .orderBy(desc(sortProgress.updatedAt));

  return Response.json({
    inProgress: rows.map((r) => ({
      sorterId: r.sorterId,
      title: r.title,
      slug: r.slug,
      coverImageUrl: r.coverImageUrl ?? undefined,
      category: r.category ?? undefined,
      completionCount: r.completionCount,
      itemCount: r.itemCount,
      updatedAt: r.updatedAt.toISOString(),
      versionMismatch: r.sorterVersion !== r.version,
    })),
  });
}

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
