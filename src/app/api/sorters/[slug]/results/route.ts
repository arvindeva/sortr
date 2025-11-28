import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sortingResults, user, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Cache recent results for 1 hour - rankings list changes infrequently
export const revalidate = 3600;

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

    // First get the sorter ID from slug
    const sorterData = await db
      .select({ id: sorters.id })
      .from(sorters)
      .where(eq(sorters.slug, slug))
      .limit(1);

    if (sorterData.length === 0) {
      return NextResponse.json({ error: "Sorter not found" }, { status: 404 });
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
    const transformedResults = recentResults.map((result) => {
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

    console.log(
      `✅ GET /api/sorters/${slug}/results - Found ${transformedResults.length} recent results`,
    );

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error(`❌ GET /api/sorters/${slug}/results error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch recent results" },
      { status: 500 },
    );
  }
}
