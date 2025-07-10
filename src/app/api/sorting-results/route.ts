import { db } from "@/db";
import { sortingResults, sorters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sorterId, rankings } = await request.json();
    
    if (!sorterId || !rankings) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get current session (optional - works for anonymous users too)
    const session = await getServerSession();
    const userId = session?.user?.id || null;

    // Save the sorting result
    const result = await db
      .insert(sortingResults)
      .values({
        sorterId,
        userId,
        rankings: JSON.stringify(rankings),
      })
      .returning({ id: sortingResults.id });

    // Increment completion count for the sorter
    await db
      .update(sorters)
      .set({ completionCount: sql`${sorters.completionCount} + 1` })
      .where(eq(sorters.id, sorterId));

    return Response.json({ 
      resultId: result[0].id,
      success: true 
    });
  } catch (error) {
    console.error("Error saving sorting results:", error);
    return Response.json({ 
      error: "Failed to save results",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}