import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// Anonymous flood cap: at most N anonymous results per sorter per IP per day.
// Generous enough that shared IPs (schools, CGNAT) never hit it in honest use
// — sitewide viral peak is ~35 results/hour across ALL IPs — while stopping
// one person hammering a community ranking with replays. In-memory like the
// feedback rate limit: resets on deploy, which is fine for a flood cap.
const ANON_CAP_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANON_CAP_PER_SORTER = 20;
const anonHits = new Map<string, number[]>();

function anonCapExceeded(ip: string, sorterId: string): boolean {
  const now = Date.now();
  // Keep the map from growing unbounded across many quiet keys.
  if (anonHits.size > 10_000) {
    for (const [key, times] of anonHits) {
      if (times.every((t) => now - t >= ANON_CAP_WINDOW_MS)) anonHits.delete(key);
    }
  }
  const key = `${ip}:${sorterId}`;
  const recent = (anonHits.get(key) ?? []).filter(
    (t) => now - t < ANON_CAP_WINDOW_MS,
  );
  if (recent.length >= ANON_CAP_PER_SORTER) return true;
  recent.push(now);
  anonHits.set(key, recent);
  return false;
}

export async function POST(request: NextRequest) {
  try {
  const { sorterId, rankings, selectedGroups, selectedTagSlugs, version: clientVersion, anonId } =
    await request.json();

    if (!sorterId || !rankings) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current session (optional - works for anonymous users too)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Per-browser id for anonymous community-ranking dedup (see lib/anon-id).
    // Only stored for anonymous submissions — logged-in dedup keys on userId.
    const validAnonId =
      !userId && typeof anonId === "string" && /^[a-f0-9-]{36}$/i.test(anonId)
        ? anonId
        : null;

    if (!userId) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
      if (anonCapExceeded(ip, sorterId)) {
        return Response.json(
          { error: "Daily limit reached for this sorter — try again tomorrow." },
          { status: 429 },
        );
      }
    }

    // Fetch current sorter data INCLUDING VERSION
    const sorterData = await db
      .select({
        title: sorters.title,
        slug: sorters.slug, // NEW: For revalidation path
        coverImageUrl: sorters.coverImageUrl,
        version: sorters.version, // NEW: Capture current version
        visibility: sorters.visibility,
        userId: sorters.userId,
      })
      .from(sorters)
      .where(eq(sorters.id, sorterId))
      .limit(1);

    if (sorterData.length === 0) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

  const {
    title: sorterTitle,
    slug: sorterSlug,
    coverImageUrl: sorterCoverImageUrl,
    version: currentVersion,
    visibility: sorterVisibility,
    userId: sorterOwnerId,
    } = sorterData[0];

    if (sorterVisibility === "private" && userId !== sorterOwnerId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pin to the version the client actually ranked (sent from the sort page).
    // If the creator edited the sorter mid-sort, the user ranked the OLD item
    // set — the result must reflect that version, so community ranking (which
    // filters to the current version) correctly excludes it. Fall back to the
    // current version for older clients that don't send one.
    const sorterVersion =
      typeof clientVersion === "number" ? clientVersion : currentVersion;

    // Save the sorting result with VERSION
    const result = await db
      .insert(sortingResults)
      .values({
        sorterId,
        userId,
        anonId: validAnonId,
        rankings: JSON.stringify(rankings), // Contains versioned URLs already
        selectedTagSlugs:
          selectedTagSlugs && selectedTagSlugs.length > 0
            ? selectedTagSlugs
            : null,
        version: sorterVersion, // Pin to the version the user actually ranked
        // Sorter-level snapshots (for quick access)
        sorterTitle,
        sorterCoverImageUrl,
      })
      .returning({ id: sortingResults.id });

    // Increment completion count for the sorter
    await db
      .update(sorters)
      .set({ completionCount: sql`${sorters.completionCount} + 1` })
      .where(eq(sorters.id, sorterId));

    return Response.json({
      resultId: result[0].id,
      success: true,
    });
  } catch (error) {
    console.error("Error saving sorting results:", error);
    return Response.json(
      {
        error: "Failed to save results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
