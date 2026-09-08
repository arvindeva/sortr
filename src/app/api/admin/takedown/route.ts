import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { reports, sorterHistory, sorters, sortingResults } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAdminUserId } from "@/lib/admin";

// POST /api/admin/takedown { slug } — soft-delete a sorter (admin only) and
// resolve every open report against it. Mirrors the owner DELETE route:
// archive to sorterHistory, deleted = true (preserve before purge — row,
// items, and rankings all stay), then revalidate the caches so the page and
// its ranking pages reflect the takedown immediately.
export async function POST(request: NextRequest) {
  // 404 (not 403) for non-admins — don't reveal the route exists.
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "Slug is required." }, { status: 400 });
    }

    const [sorter] = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        coverImageUrl: sorters.coverImageUrl,
        version: sorters.version,
      })
      .from(sorters)
      .where(and(eq(sorters.slug, slug), eq(sorters.deleted, false)))
      .limit(1);
    if (!sorter) {
      return NextResponse.json(
        { error: "Sorter not found or already removed." },
        { status: 404 },
      );
    }

    // Archive current version to sorterHistory (if not already there).
    try {
      await db.insert(sorterHistory).values({
        sorterId: sorter.id,
        title: sorter.title,
        description: sorter.description,
        coverImageUrl: sorter.coverImageUrl,
        version: sorter.version,
      });
    } catch {
      // Might already exist (unique constraint) — silently continue.
    }

    await db
      .update(sorters)
      .set({ deleted: true })
      .where(eq(sorters.id, sorter.id));

    await db
      .update(reports)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(reports.sorterId, sorter.id), eq(reports.status, "open")));

    // Clear cached metadata + every ranking page for this sorter, matching
    // the owner delete route.
    revalidateTag(`sorter-metadata-${sorter.id}`);
    revalidateTag(`sorter-slug-${slug}`);
    const rankings = await db
      .select({ id: sortingResults.id })
      .from(sortingResults)
      .where(eq(sortingResults.sorterId, sorter.id));
    for (const ranking of rankings) {
      revalidateTag(`ranking-${ranking.id}`);
    }

    return NextResponse.json({ ok: true, title: sorter.title });
  } catch (error) {
    console.error("Error taking down sorter:", error);
    return NextResponse.json(
      { error: "Failed to take down sorter." },
      { status: 500 },
    );
  }
}
