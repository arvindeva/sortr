import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sortingResults, user, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

async function getRecentResultsUncached(slug: string) {
  // First get the sorter ID from slug
  const sorterData = await db
    .select({ id: sorters.id })
    .from(sorters)
    .where(eq(sorters.slug, slug))
    .limit(1);

  if (sorterData.length === 0) {
    return null;
  }

  const sorterId = sorterData[0].id;

  // Get recent results for this sorter
  const recentResults = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      createdAt: sortingResults.createdAt,
      username: user.username,
    })
    .from(sortingResults)
    .leftJoin(user, eq(sortingResults.userId, user.id))
    .where(eq(sortingResults.sorterId, sorterId))
    .orderBy(desc(sortingResults.createdAt))
    .limit(10);

  // Transform results to match expected format
  return recentResults.map((result) => {
    let rankings = [];
    try {
      rankings = JSON.parse(result.rankings);
    } catch (error) {
      console.error("Failed to parse rankings:", error);
    }

    return {
      id: result.id,
      username: result.username || "Anonymous",
      top3: rankings.slice(0, 3),
      createdAt: result.createdAt,
    };
  });
}

async function getRecentResultsCached(slug: string) {
  return unstable_cache(
    async () => getRecentResultsUncached(slug),
    [`sorter-recent-results`, slug],
    {
      revalidate: 600,
      tags: [`sorter-recent-results`, `sorter-results-${slug}`]
    }
  )();
}

// GET /api/sorters/[slug]/results - Get recent results for a sorter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    console.log(
      `🔍 GET /api/sorters/${slug}/results - Fetching recent results`,
    );

    const transformedResults = await getRecentResultsCached(slug);

    if (!transformedResults) {
      return NextResponse.json({ error: "Sorter not found" }, { status: 404 });
    }

    console.log(
      `✅ GET /api/sorters/${slug}/results - Found ${transformedResults.length} recent results`,
    );

    // Disable CDN cache for frequently edited content - rely on Next.js Data Cache instead
    return NextResponse.json(transformedResults, {
      headers: {
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(`❌ GET /api/sorters/${slug}/results error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch recent results" },
      { status: 500 },
    );
  }
}
