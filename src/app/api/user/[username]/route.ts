import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, sorters, sortingResults } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { username } = await params;
    console.log(
      `👤 GET /api/user/${username} - Fetching complete user profile`,
    );

    // Handle anonymous user case
    if (username === "Anonymous" || username === "Unknown User") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user by username
    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    const userData = users[0];
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`👤 Found user: ${userData.username} (${userData.id})`);

    // Get user stats in parallel
    const [sorterCountResult, rankingCountResult] = await Promise.all([
      db
        .select({ count: count() })
        .from(sorters)
        .where(
          and(eq(sorters.userId, userData.id), eq(sorters.deleted, false)),
        ),
      db
        .select({ count: count() })
        .from(sortingResults)
        .where(eq(sortingResults.userId, userData.id)),
    ]);

    const sorterCount = sorterCountResult[0].count;
    const rankingCount = rankingCountResult[0].count;

    // Get user's sorters
    const userSorters = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        slug: sorters.slug,
        description: sorters.description,
        category: sorters.category,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        coverImageUrl: sorters.coverImageUrl,
      })
      .from(sorters)
      .where(and(eq(sorters.userId, userData.id), eq(sorters.deleted, false)))
      .orderBy(desc(sorters.createdAt));

    // Get user's rankings
    const userResults = await db
      .select({
        id: sortingResults.id,
        sorterId: sortingResults.sorterId,
        rankings: sortingResults.rankings,
        createdAt: sortingResults.createdAt,
        sorterTitle: sorters.title,
        sorterSlug: sorters.slug,
        sorterCategory: sorters.category,
      })
      .from(sortingResults)
      .leftJoin(sorters, eq(sortingResults.sorterId, sorters.id))
      .where(eq(sortingResults.userId, userData.id))
      .orderBy(desc(sortingResults.createdAt));

    // Transform sorters data
    const transformedSorters = userSorters.map((sorter) => ({
      ...sorter,
      creatorUsername: userData.username || "Unknown",
      coverImageUrl: sorter.coverImageUrl ?? undefined,
      category: sorter.category ?? undefined,
    }));

    // Transform rankings data to include top 3 for previews
    const transformedResults = userResults.map((result) => {
      let rankings = [];
      let top3 = [];

      try {
        rankings = JSON.parse(result.rankings);
        top3 = rankings.slice(0, 3);
      } catch (error) {
        console.error("Failed to parse rankings:", error);
      }

      return {
        id: result.id,
        sorterId: result.sorterId,
        rankings: result.rankings, // Keep original JSON string
        top3, // Parsed top 3 for preview
        createdAt: result.createdAt,
        sorterTitle: result.sorterTitle || "Unknown Sorter",
        sorterSlug: result.sorterSlug,
        sorterCategory: result.sorterCategory,
      };
    });

    const userSince = new Date(
      userData.emailVerified || new Date(),
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    console.log(
      `📊 GET /api/user/${username} - Complete: ${sorterCount} sorters, ${rankingCount} rankings`,
    );

    return NextResponse.json({
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        image: userData.image,
        emailVerified: userData.emailVerified,
      },
      stats: {
        sorterCount,
        rankingCount,
      },
      sorters: transformedSorters,
      rankings: transformedResults,
      userSince,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ GET /api/user/[username] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 },
    );
  }
}
