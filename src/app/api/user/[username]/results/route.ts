import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, sortingResults, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    // Get user by username
    const userData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userData[0].id;

    // Get user's sorting results with sorter information
    const userResults = await db
      .select({
        id: sortingResults.id,
        sorterId: sortingResults.sorterId,
        rankings: sortingResults.rankings,
        selectedGroups: sortingResults.selectedGroups,
        createdAt: sortingResults.createdAt,
        sorterTitle: sorters.title,
        sorterSlug: sorters.slug,
        sorterCategory: sorters.category,
      })
      .from(sortingResults)
      .leftJoin(sorters, eq(sortingResults.sorterId, sorters.id))
      .where(eq(sortingResults.userId, userId))
      .orderBy(desc(sortingResults.createdAt));

    return NextResponse.json(userResults);
  } catch (error) {
    console.error("Error fetching user results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
