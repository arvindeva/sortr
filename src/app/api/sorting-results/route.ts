import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
  const { sorterId, rankings, selectedGroups, selectedTagSlugs, version: clientVersion } =
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

    // Fetch current sorter data INCLUDING VERSION
    const sorterData = await db
      .select({
        title: sorters.title,
        slug: sorters.slug, // NEW: For revalidation path
        coverImageUrl: sorters.coverImageUrl,
        version: sorters.version, // NEW: Capture current version
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
    } = sorterData[0];

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
