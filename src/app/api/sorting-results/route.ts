import { db } from "@/db";
import { sortingResults, sorters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { sorterId, rankings, selectedGroups } = await request.json();

    if (!sorterId || !rankings) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current session (optional - works for anonymous users too)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Save the sorting result
    const result = await db
      .insert(sortingResults)
      .values({
        sorterId,
        userId,
        rankings: JSON.stringify(rankings),
        selectedGroups: selectedGroups ? JSON.stringify(selectedGroups) : null,
      })
      .returning({ id: sortingResults.id });

    // Increment completion count for the sorter
    await db
      .update(sorters)
      .set({ completionCount: sql`${sorters.completionCount} + 1` })
      .where(eq(sorters.id, sorterId));

    // Invalidate pages that show completion counts
    revalidatePath("/"); // Homepage popular sorters
    revalidatePath(`/sorter/${sorterId}`); // Individual sorter page

    // Also invalidate any user profile pages that might show this sorter
    // Note: We could be more specific if we had the creator's username
    revalidatePath("/user/[username]", "page");

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
