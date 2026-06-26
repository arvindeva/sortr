import { db } from "@/db";
import { sorters, sortingResults, user } from "@/db/schema";
import { and, eq, gte, isNotNull, isNull, sql, desc } from "drizzle-orm";

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
  // Per-day ranking activity for the last ~12 weeks.
  rankingsPerDay: { day: string; count: number }[];
  // Anonymous vs. logged-in rankings.
  rankingsByAuth: { anonymous: number; loggedIn: number };
  // Top sorters by plays.
  topSorters: { title: string; slug: string; plays: number }[];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getAdminStats(): Promise<AdminStats> {
  const sevenDaysAgo = daysAgo(7);
  const twelveWeeksAgo = daysAgo(84);

  const [
    usersCount,
    sortersCount,
    rankingsCount,
    sorters7d,
    rankings7d,
    sortersByWeek,
    rankingsByDay,
    anonRankings,
    authRankings,
    top,
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
  ]);

  // Running cumulative for sorters-over-time.
  let runningTotal = 0;
  const sortersOverTime = sortersByWeek.map((row) => {
    runningTotal += row.created;
    return { week: row.week, created: row.created, cumulative: runningTotal };
  });

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
    rankingsPerDay: rankingsByDay,
    rankingsByAuth: {
      anonymous: anonRankings[0]?.c ?? 0,
      loggedIn: authRankings[0]?.c ?? 0,
    },
    topSorters: top,
  };
}
