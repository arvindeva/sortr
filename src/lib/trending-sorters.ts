import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sorters, sortingResults, user } from "@/db/schema";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";

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

const WINDOW_DAYS = 7;

async function computeTrendingSorters(
  limit: number,
  excludeSorterId?: string,
): Promise<TrendingSorter[]> {
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const rows = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      category: sorters.category,
      completionCount: sorters.completionCount,
      coverImageUrl: sorters.coverImageUrl,
      creatorUsername: user.username,
      recentPlays: sql<number>`count(${sortingResults.id})::int`,
    })
    .from(sortingResults)
    .innerJoin(sorters, eq(sortingResults.sorterId, sorters.id))
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(
      and(
        eq(sorters.deleted, false),
        eq(sorters.status, "active"),
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
 * Sorters with the most plays in the last {@link WINDOW_DAYS} days — "trending
 * this week". Surfaces what's hot *right now* (including newer sorters riding a
 * viral wave), which all-time Popular can't. Cached 5 min like the homepage.
 *
 * `excludeSorterId` omits the current sorter when shown on its own page.
 */
export const getTrendingSorters = unstable_cache(
  computeTrendingSorters,
  ["trending-sorters"],
  { revalidate: 300 },
);
