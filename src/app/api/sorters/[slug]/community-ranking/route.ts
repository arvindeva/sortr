import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sorters } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCommunityRanking } from "@/lib/community-ranking-data";

// GET /api/sorters/[slug]/community-ranking
// Fetched client-side so the (potentially heavy) aggregate never blocks the
// page render — the page loads instantly and this fills in.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const rows = await db
      .select({ id: sorters.id, version: sorters.version })
      .from(sorters)
      .where(
        and(
          eq(sorters.slug, slug),
          eq(sorters.deleted, false),
          eq(sorters.status, "active"),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Sorter not found" }, { status: 404 });
    }

    const { id, version } = rows[0];
    const data = await getCommunityRanking(id, version);

    // 200 with null is a valid state ("not enough rankings yet").
    return NextResponse.json(data);
  } catch (error) {
    console.error(`❌ GET /api/sorters/${slug}/community-ranking error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch community ranking" },
      { status: 500 },
    );
  }
}
