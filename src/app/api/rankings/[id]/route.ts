import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sortingResults, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateUserResults } from "@/lib/revalidation";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user data
    const userData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUserId = userData[0].id;

    // Check if the ranking exists and belongs to the current user
    const ranking = await db
      .select({
        id: sortingResults.id,
        userId: sortingResults.userId,
      })
      .from(sortingResults)
      .where(eq(sortingResults.id, id))
      .limit(1);

    if (ranking.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    // Check ownership - only the owner can delete their ranking
    if (ranking[0].userId !== currentUserId) {
      return NextResponse.json(
        { error: "You can only delete your own rankings" },
        { status: 403 },
      );
    }

    // Delete the ranking (hard deletion as requested)
    await db.delete(sortingResults).where(eq(sortingResults.id, id));

    // Revalidate user results cache
    try {
      await revalidateUserResults(currentUserId);
    } catch (revalidateError) {
      console.warn("Failed to revalidate user results cache:", revalidateError);
      // Don't fail the entire request if revalidation fails
    }

    return NextResponse.json({
      success: true,
      message: "Ranking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ranking:", error);
    return NextResponse.json(
      { error: "Failed to delete ranking" },
      { status: 500 },
    );
  }
}
