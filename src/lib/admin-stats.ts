import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sorters, sortingResults, user, feedback } from "@/db/schema";
import { and, eq, gte, isNotNull, isNull, sql, desc } from "drizzle-orm";

export interface FeedbackRow {
  id: string;
  message: string;
  email: string | null;
  pageUrl: string | null;
  createdAt: Date;
}

/** Recent feedback submissions (uncached — you want to see new ones promptly). */
export async function getRecentFeedback(limit = 50): Promise<FeedbackRow[]> {
  return db
    .select({
      id: feedback.id,
      message: feedback.message,
      email: feedback.email,
      pageUrl: feedback.pageUrl,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(limit);
}

export interface AdminStats {
  totals: {
    users: number;
    sorters: number;
    rankings: number;
  };
  last7Days: {
    sorters: number;
    rankings: number;
  };
  // Per-week sorter creation (oldest → newest), with a running cumulative total.
  sortersOverTime: { week: string; created: number; cumulative: number }[];
  // Per-week ranking creation (oldest → newest), with a running cumulative total.
  rankingsOverTime: { week: string; created: number; cumulative: number }[];
  // Per-day ranking activity for the last ~12 weeks.
  rankingsPerDay: { day: string; count: number }[];
  // Anonymous vs. logged-in rankings.
  rankingsByAuth: { anonymous: number; loggedIn: number };
  // Top sorters by plays, per timeframe. "all" uses the cumulative
  // completionCount; the windowed ones count rankings (sortingResults) created
  // within the window.
  topSorters: {
    all: TopSorter[];
    day: TopSorter[];
    week: TopSorter[];
    month: TopSorter[];
  };
}

export interface TopSorter {
  title: string;
  slug: string;
  plays: number;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Top sorters by play count (ranking submissions) within a time window.
async function topSortersSince(since: Date): Promise<TopSorter[]> {
  const rows = await db
    .select({
      title: sorters.title,
      slug: sorters.slug,
      plays: sql<number>`count(*)::int`,
    })
    .from(sortingResults)
    .innerJoin(sorters, eq(sortingResults.sorterId, sorters.id))
    .where(and(eq(sorters.deleted, false), gte(sortingResults.createdAt, since)))
    .groupBy(sorters.id, sorters.title, sorters.slug)
    .orderBy(desc(sql`count(*)`))
    .limit(8);
  return rows;
}

async function computeAdminStats(): Promise<AdminStats> {
  const oneDayAgo = daysAgo(1);
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);
  const twelveWeeksAgo = daysAgo(84);

  const [
    usersCount,
    sortersCount,
    rankingsCount,
    sorters7d,
    rankings7d,
    sortersByWeek,
    rankingsByWeek,
    rankingsByDay,
    anonRankings,
    authRankings,
    topAll,
    topDay,
    topWeek,
    topMonth,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(user),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(sorters)
      .where(eq(sorters.deleted, false)),
    db.select({ c: sql<number>`count(*)::int` }).from(sortingResults),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(sorters)
      .where(
        and(eq(sorters.deleted, false), gte(sorters.createdAt, sevenDaysAgo)),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(sortingResults)
      .where(gte(sortingResults.createdAt, sevenDaysAgo)),
    // Sorters grouped by week.
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${sorters.createdAt}), 'YYYY-MM-DD')`,
        created: sql<number>`count(*)::int`,
      })
      .from(sorters)
      .where(eq(sorters.deleted, false))
      .groupBy(sql`date_trunc('week', ${sorters.createdAt})`)
      .orderBy(sql`date_trunc('week', ${sorters.createdAt})`),
    // Rankings grouped by week.
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${sortingResults.createdAt}), 'YYYY-MM-DD')`,
        created: sql<number>`count(*)::int`,
      })
      .from(sortingResults)
      .groupBy(sql`date_trunc('week', ${sortingResults.createdAt})`)
      .orderBy(sql`date_trunc('week', ${sortingResults.createdAt})`),
    // Rankings per day, last 12 weeks.
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${sortingResults.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(sortingResults)
      .where(gte(sortingResults.createdAt, twelveWeeksAgo))
      .groupBy(sql`date_trunc('day', ${sortingResults.createdAt})`)
      .orderBy(sql`date_trunc('day', ${sortingResults.createdAt})`),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(sortingResults)
      .where(isNull(sortingResults.userId)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(sortingResults)
      .where(isNotNull(sortingResults.userId)),
    // All-time top sorters use the cumulative completionCount.
    db
      .select({
        title: sorters.title,
        slug: sorters.slug,
        plays: sorters.completionCount,
      })
      .from(sorters)
      .where(eq(sorters.deleted, false))
      .orderBy(desc(sorters.completionCount))
      .limit(8),
    // Windowed top sorters count rankings within the window.
    topSortersSince(oneDayAgo),
    topSortersSince(sevenDaysAgo),
    topSortersSince(thirtyDaysAgo),
  ]);

  // Running cumulative totals for the over-time charts.
  const withCumulative = (rows: { week: string; created: number }[]) => {
    let total = 0;
    return rows.map((row) => {
      total += row.created;
      return { week: row.week, created: row.created, cumulative: total };
    });
  };
  const sortersOverTime = withCumulative(sortersByWeek);
  const rankingsOverTime = withCumulative(rankingsByWeek);

  return {
    totals: {
      users: usersCount[0]?.c ?? 0,
      sorters: sortersCount[0]?.c ?? 0,
      rankings: rankingsCount[0]?.c ?? 0,
    },
    last7Days: {
      sorters: sorters7d[0]?.c ?? 0,
      rankings: rankings7d[0]?.c ?? 0,
    },
    sortersOverTime,
    rankingsOverTime,
    rankingsPerDay: rankingsByDay,
    rankingsByAuth: {
      anonymous: anonRankings[0]?.c ?? 0,
      loggedIn: authRankings[0]?.c ?? 0,
    },
    topSorters: {
      all: topAll,
      day: topDay,
      week: topWeek,
      month: topMonth,
    },
  };
}

/**
 * Cached admin stats. The dashboard doesn't need real-time data, so we recompute
 * at most every 5 minutes — repeat opens/refreshes within the window serve the
 * cached result instantly with zero DB hits.
 */
export const getAdminStats = unstable_cache(computeAdminStats, ["admin-stats"], {
  revalidate: 300,
});
