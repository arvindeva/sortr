import { db } from "@/db";
import { sortProgress, sorters } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// GET /api/sort-progress/[sorterId] — the logged-in user's saved progress for a
// sorter (for resume). Returns { progress: null } if none. Includes the current
// sorter version so the client can detect a version mismatch.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sorterId: string }> },
) {
  try {
    const { sorterId } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ progress: null }, { status: 200 });
    }

    const [row] = await db
      .select({
        state: sortProgress.state,
        version: sortProgress.version,
        itemCount: sortProgress.itemCount,
        updatedAt: sortProgress.updatedAt,
      })
      .from(sortProgress)
      .where(
        and(
          eq(sortProgress.userId, userId),
          eq(sortProgress.sorterId, sorterId),
        ),
      )
      .limit(1);

    if (!row) return Response.json({ progress: null });

    const [sorter] = await db
      .select({ version: sorters.version })
      .from(sorters)
      .where(eq(sorters.id, sorterId))
      .limit(1);

    return Response.json({
      progress: {
        state: row.state,
        version: row.version,
        itemCount: row.itemCount,
        updatedAt: row.updatedAt.toISOString(),
        // True if the sorter was edited after this progress was saved.
        versionMismatch: sorter ? sorter.version !== row.version : false,
      },
    });
  } catch (error) {
    console.error("Error fetching sort progress:", error);
    return Response.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// DELETE /api/sort-progress/[sorterId] — clear the saved progress (on completion
// or explicit restart).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sorterId: string }> },
) {
  try {
    const { sorterId } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ ok: true });
    }

    await db
      .delete(sortProgress)
      .where(
        and(
          eq(sortProgress.userId, userId),
          eq(sortProgress.sorterId, sorterId),
        ),
      );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error deleting sort progress:", error);
    return Response.json({ error: "Failed to delete progress" }, { status: 500 });
  }
}
