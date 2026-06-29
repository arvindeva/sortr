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
    users: number;
    sorters: number;
    rankings: number;
  };
  // Per-week creation (oldest → newest), with a running cumulative total.
  usersOverTime: { week: string; created: number; cumulative: number }[];
  sortersOverTime: { week: string; created: number; cumulative: number }[];
  rankingsOverTime: { week: string; created: number; cumulative: number }[];
  // Activity bar charts (new per bucket) across selectable timeframes (24h
  // hourly, week daily, month daily, 3mo weekly). Users are bucketed by
  // emailVerified (the real signup timestamp; every user has one).
  rankingsActivity: ActivityByTimeframe;
  sortersActivity: ActivityByTimeframe;
  usersActivity: ActivityByTimeframe;
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

export interface ActivityBucket {
  bucket: string; // ISO label for the x-axis
  count: number;
}
export interface ActivityByTimeframe {
  day: ActivityBucket[]; // last 24h, hourly
  week: ActivityBucket[]; // last 7d, daily
  month: ActivityBucket[]; // last 30d, daily
  quarter: ActivityBucket[]; // last ~12w, weekly
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

// Postgres requires the date_trunc unit to be an inline literal, not a bound
// parameter, so we sql.raw it — safe because `unit` is a fixed internal enum
// (never user input), and we hard-validate it here regardless.
function truncLiteral(unit: "hour" | "day" | "week") {
  const safe: Record<string, string> = { hour: "hour", day: "day", week: "week" };
  return sql.raw(`'${safe[unit]}'`);
}

// Rankings activity: count sortingResults created since `since`, bucketed by
// date_trunc(unit, createdAt).
async function rankingsBuckets(
  unit: "hour" | "day" | "week",
  since: Date,
): Promise<ActivityBucket[]> {
  const trunc = sql`date_trunc(${truncLiteral(unit)}, ${sortingResults.createdAt})`;
  return db
    .select({
      bucket: sql<string>`to_char(${trunc}, 'YYYY-MM-DD"T"HH24:00')`,
      count: sql<number>`count(*)::int`,
    })
    .from(sortingResults)
    .where(gte(sortingResults.createdAt, since))
    .groupBy(trunc)
    .orderBy(trunc);
}

// Sorters activity: count active, non-deleted sorters created since `since`.
async function sortersBuckets(
  unit: "hour" | "day" | "week",
  since: Date,
): Promise<ActivityBucket[]> {
  const trunc = sql`date_trunc(${truncLiteral(unit)}, ${sorters.createdAt})`;
  return db
    .select({
      bucket: sql<string>`to_char(${trunc}, 'YYYY-MM-DD"T"HH24:00')`,
      count: sql<number>`count(*)::int`,
    })
    .from(sorters)
    .where(
      and(
        gte(sorters.createdAt, since),
        eq(sorters.deleted, false),
        eq(sorters.status, "active"),
      ),
    )
    .groupBy(trunc)
    .orderBy(trunc);
}

// Users activity: count users by emailVerified (the real signup timestamp —
// every user has one; user.createdAt is backfilled and useless for history).
async function usersBuckets(
  unit: "hour" | "day" | "week",
  since: Date,
): Promise<ActivityBucket[]> {
  const trunc = sql`date_trunc(${truncLiteral(unit)}, ${user.emailVerified})`;
  return db
    .select({
      bucket: sql<string>`to_char(${trunc}, 'YYYY-MM-DD"T"HH24:00')`,
      count: sql<number>`count(*)::int`,
    })
    .from(user)
    .where(and(isNotNull(user.emailVerified), gte(user.emailVerified, since)))
    .groupBy(trunc)
    .orderBy(trunc);
}

async function usersActivityAll(): Promise<ActivityByTimeframe> {
  const [day, week, month, quarter] = await Promise.all([
    usersBuckets("hour", daysAgo(1)),
    usersBuckets("day", daysAgo(7)),
    usersBuckets("day", daysAgo(30)),
    usersBuckets("week", daysAgo(84)),
  ]);
  return { day, week, month, quarter };
}

async function rankingsActivityAll(): Promise<ActivityByTimeframe> {
  const [day, week, month, quarter] = await Promise.all([
    rankingsBuckets("hour", daysAgo(1)),
    rankingsBuckets("day", daysAgo(7)),
    rankingsBuckets("day", daysAgo(30)),
    rankingsBuckets("week", daysAgo(84)),
  ]);
  return { day, week, month, quarter };
}

async function sortersActivityAll(): Promise<ActivityByTimeframe> {
  const [day, week, month, quarter] = await Promise.all([
    sortersBuckets("hour", daysAgo(1)),
    sortersBuckets("day", daysAgo(7)),
    sortersBuckets("day", daysAgo(30)),
    sortersBuckets("week", daysAgo(84)),
  ]);
  return { day, week, month, quarter };
}

async function computeAdminStats(): Promise<AdminStats> {
  const oneDayAgo = daysAgo(1);
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  const [
    usersCount,
    sortersCount,
    rankingsCount,
    users7d,
    sorters7d,
    rankings7d,
    sortersByWeek,
    rankingsByWeek,
    usersByWeek,
    rankingsActivity,
    sortersActivity,
    usersActivity,
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
    // New users in the last 7 days (by emailVerified — the signup timestamp).
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(user)
      .where(
        and(
          isNotNull(user.emailVerified),
          gte(user.emailVerified, sevenDaysAgo),
        ),
      ),
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
    // Users grouped by week (by emailVerified — the real signup time).
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${user.emailVerified}), 'YYYY-MM-DD')`,
        created: sql<number>`count(*)::int`,
      })
      .from(user)
      .where(isNotNull(user.emailVerified))
      .groupBy(sql`date_trunc('week', ${user.emailVerified})`)
      .orderBy(sql`date_trunc('week', ${user.emailVerified})`),
    // Activity bar charts (rankings + sorters + users) across all timeframes.
    rankingsActivityAll(),
    sortersActivityAll(),
    usersActivityAll(),
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
  const usersOverTime = withCumulative(usersByWeek);
  const sortersOverTime = withCumulative(sortersByWeek);
  const rankingsOverTime = withCumulative(rankingsByWeek);

  return {
    totals: {
      users: usersCount[0]?.c ?? 0,
      sorters: sortersCount[0]?.c ?? 0,
      rankings: rankingsCount[0]?.c ?? 0,
    },
    last7Days: {
      users: users7d[0]?.c ?? 0,
      sorters: sorters7d[0]?.c ?? 0,
      rankings: rankings7d[0]?.c ?? 0,
    },
    usersOverTime,
    sortersOverTime,
    rankingsOverTime,
    rankingsActivity,
    sortersActivity,
    usersActivity,
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
