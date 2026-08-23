import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sorters, sortingResults, user } from "@/db/schema";
import { previewItemsSql } from "@/lib/sorter-preview";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { listableSorter } from "@/lib/sorter-visibility";
import type { TrendingSorter } from "@/lib/trending-sorters";

/**
 * Per-category queries for the /sorters/<slug> hub pages. Card-shaped
 * payloads (same shape as the trending machinery), listableSorter()-gated,
 * cached ~5 min.
 */

async function computeTrendingInCategory(
  category: string,
  limit: number,
): Promise<TrendingSorter[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      category: sorters.category,
      completionCount: sorters.completionCount,
      coverImageUrl: sorters.coverImageUrl,
      previewItems: previewItemsSql,
      creatorUsername: user.username,
      recentPlays: sql<number>`count(${sortingResults.id})::int`,
    })
    .from(sortingResults)
    .innerJoin(sorters, eq(sortingResults.sorterId, sorters.id))
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(
      and(
        listableSorter(),
        eq(sorters.category, category),
        gte(sortingResults.createdAt, since),
      ),
    )
    .groupBy(
      sorters.id,
      sorters.title,
      sorters.slug,
      sorters.category,
      sorters.completionCount,
      sorters.coverImageUrl,
      user.username,
    )
    .orderBy(desc(sql`count(${sortingResults.id})`))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    category: r.category ?? undefined,
    coverImageUrl: r.coverImageUrl ?? undefined,
    creatorUsername: r.creatorUsername ?? "Unknown",
  }));
}

async function computePopularInCategory(
  category: string,
  limit: number,
): Promise<TrendingSorter[]> {
  const rows = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      category: sorters.category,
      completionCount: sorters.completionCount,
      coverImageUrl: sorters.coverImageUrl,
      previewItems: previewItemsSql,
      creatorUsername: user.username,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(and(listableSorter(), eq(sorters.category, category)))
    .orderBy(desc(sorters.completionCount))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    category: r.category ?? undefined,
    coverImageUrl: r.coverImageUrl ?? undefined,
    creatorUsername: r.creatorUsername ?? "Unknown",
    recentPlays: 0,
  }));
}

async function computeCategoryCount(category: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(sorters)
    .where(and(listableSorter(), eq(sorters.category, category)));
  return row?.c ?? 0;
}

export const getTrendingInCategory = unstable_cache(
  computeTrendingInCategory,
  ["trending-in-category"],
  { revalidate: 300 },
);

export const getPopularInCategory = unstable_cache(
  computePopularInCategory,
  ["popular-in-category"],
  { revalidate: 300 },
);

export const getCategoryCount = unstable_cache(
  computeCategoryCount,
  ["category-count"],
  { revalidate: 300 },
);
