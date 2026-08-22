import { unstable_cache } from "next/cache";
import { Pool } from "pg";

/**
 * Read-only queries against the self-hosted Umami analytics Postgres, for the
 * admin dashboard's Traffic section. Connects with a dedicated SELECT-only
 * role (UMAMI_DATABASE_URL env var; Railway-internal host in prod, public
 * proxy locally). Everything degrades to null — missing env var, connection
 * or query failure — so the dashboard simply omits the section rather than
 * breaking.
 */

export interface TrafficStats {
  visitors7d: number;
  visitorsPrev7d: number;
  sortStarts7d: number;
  sortCompletes7d: number;
  imageDownloads7d: number;
  clientErrors24h: number;
  weeklyVisitors: { week: string; visitors: number }[];
  /** Sort starts vs completions per week — may be empty if its (heavier)
   *  query times out; the section renders without the chart then. */
  weeklyFunnel: { week: string; started: number; completed: number }[];
}

let pool: Pool | null = null;
function umamiPool(): Pool | null {
  if (!process.env.UMAMI_DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.UMAMI_DATABASE_URL,
      max: 3, // admin-only traffic; keep the footprint tiny
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// The single sortr website row's id — resolved once per process.
let websiteIdPromise: Promise<string | null> | null = null;
function websiteId(p: Pool): Promise<string | null> {
  if (!websiteIdPromise) {
    websiteIdPromise = p
      .query<{ website_id: string }>(
        `select website_id from website where domain = 'sortr.io' limit 1`,
      )
      .then((r) => r.rows[0]?.website_id ?? null)
      .catch(() => {
        websiteIdPromise = null; // allow retry next request
        return null;
      });
  }
  return websiteIdPromise;
}

async function getTrafficStatsUncached(): Promise<TrafficStats | null> {
  const p = umamiPool();
  if (!p) return null;
  try {
    const wid = await websiteId(p);
    if (!wid) return null;

    const [visitors, weekly, events, errors] = await Promise.all([
      p.query<{ v7: string; vprev: string }>(
        `select count(*) filter (where created_at >= now() - interval '7 days') as v7,
                count(*) filter (where created_at >= now() - interval '14 days'
                             and created_at <  now() - interval '7 days') as vprev
         from session
         where website_id = $1 and created_at >= now() - interval '14 days'`,
        [wid],
      ),
      p.query<{ week: string; visitors: string }>(
        `select date_trunc('week', created_at)::date::text as week,
                count(*) as visitors
         from session
         where website_id = $1 and created_at >= now() - interval '10 weeks'
         group by 1 order by 1`,
        [wid],
      ),
      p.query<{ event_name: string; n: string }>(
        `select event_name, count(*) as n
         from website_event
         where website_id = $1
           and created_at >= now() - interval '7 days'
           and event_name in ('sort_started','sort_completed','image_downloaded')
         group by 1`,
        [wid],
      ),
      p.query<{ n: string }>(
        `select count(*) as n
         from website_event
         where website_id = $1
           and created_at >= now() - interval '24 hours'
           and event_name = 'client_error'`,
        [wid],
      ),
    ]);

    const byName = new Map(
      events.rows.map((r) => [r.event_name, parseInt(r.n, 10)]),
    );

    // Heavier scan (8 weeks of events) — guarded separately so a timeout
    // costs one chart, not the whole section.
    let weeklyFunnel: TrafficStats["weeklyFunnel"] = [];
    try {
      const funnel = await p.query<{
        week: string;
        event_name: string;
        n: string;
      }>(
        `select date_trunc('week', created_at)::date::text as week,
                event_name, count(*) as n
         from website_event
         where website_id = $1
           and created_at >= now() - interval '8 weeks'
           and event_name in ('sort_started','sort_completed')
         group by 1, 2 order by 1`,
        [wid],
      );
      const byWeek = new Map<string, { started: number; completed: number }>();
      for (const r of funnel.rows) {
        const w = byWeek.get(r.week) ?? { started: 0, completed: 0 };
        if (r.event_name === "sort_started") w.started = parseInt(r.n, 10);
        else w.completed = parseInt(r.n, 10);
        byWeek.set(r.week, w);
      }
      weeklyFunnel = [...byWeek.entries()]
        .map(([week, v]) => ({ week, ...v }))
        .sort((a, b) => a.week.localeCompare(b.week));
    } catch (error) {
      console.error("Umami weekly funnel query failed:", error);
    }

    return {
      visitors7d: parseInt(visitors.rows[0]?.v7 ?? "0", 10),
      visitorsPrev7d: parseInt(visitors.rows[0]?.vprev ?? "0", 10),
      sortStarts7d: byName.get("sort_started") ?? 0,
      sortCompletes7d: byName.get("sort_completed") ?? 0,
      imageDownloads7d: byName.get("image_downloaded") ?? 0,
      clientErrors24h: parseInt(errors.rows[0]?.n ?? "0", 10),
      weeklyVisitors: weekly.rows.map((r) => ({
        week: r.week,
        visitors: parseInt(r.visitors, 10),
      })),
      weeklyFunnel,
    };
  } catch (error) {
    console.error("Umami traffic stats failed:", error);
    return null;
  }
}

/**
 * Cached for an hour: the admin page renders instantly on repeat visits and
 * the analytics DB sees at most ~24 query bundles/day from the dashboard.
 */
export async function getTrafficStats(): Promise<TrafficStats | null> {
  return unstable_cache(getTrafficStatsUncached, ["admin-traffic-stats"], {
    revalidate: 3600,
  })();
}
