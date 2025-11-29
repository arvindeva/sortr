import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { sorterId, rankings, selectedGroups, selectedTagSlugs } =
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
      version: sorterVersion,
    } = sorterData[0];

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
        version: sorterVersion, // Pin to specific version
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

    // Keep revalidation focused to reduce cache churn under load.
    // Sorter page shows completion count; homepage/browse will refresh via ISR.
    revalidatePath(`/sorter/${sorterSlug}`);
    console.log(`♻️ Revalidated sorter page for completion count update: ${sorterSlug}`);

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
