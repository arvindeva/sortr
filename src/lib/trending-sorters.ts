import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sorters, sortingResults, user } from "@/db/schema";
import { previewItemsSql } from "@/lib/sorter-preview";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { listableSorter } from "@/lib/sorter-visibility";

export interface TrendingSorter {
  id: string;
  title: string;
  slug: string;
  category?: string;
  completionCount: number;
  coverImageUrl?: string;
  creatorUsername: string;
  /** Plays within the trending window (the ranking signal). */
  recentPlays: number;
}

const WEEK_HOURS = 7 * 24;
const DAY_HOURS = 24;

async function computeTrendingSorters(
  windowHours: number,
  limit: number,
  excludeSorterId?: string,
): Promise<TrendingSorter[]> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

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
        gte(sortingResults.createdAt, since),
        excludeSorterId ? ne(sorters.id, excludeSorterId) : undefined,
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

/**
 * Sorters with the most plays in the last 7 days — "trending this week".
 * Surfaces what's hot *right now* (including newer sorters riding a viral
 * wave), which all-time Popular can't. Cached 5 min like the homepage.
 *
 * `excludeSorterId` omits the current sorter when shown on its own page.
 */
export const getTrendingSorters = unstable_cache(
  (limit: number, excludeSorterId?: string) =>
    computeTrendingSorters(WEEK_HOURS, limit, excludeSorterId),
  ["trending-sorters"],
  { revalidate: 300 },
);

/**
 * Sorters with the most plays in the last 24 hours — "hot sorters". The
 * tighter window makes the list move visit to visit (prod check: only ~2 of
 * the top 10 overlap the weekly list). Same 5 min cache.
 */
export const getHotSorters = unstable_cache(
  (limit: number, excludeSorterId?: string) =>
    computeTrendingSorters(DAY_HOURS, limit, excludeSorterId),
  ["hot-sorters"],
  { revalidate: 300 },
);
