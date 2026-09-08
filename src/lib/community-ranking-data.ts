import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sorterItems, sortingResults } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  computeCommunityRanking,
  mapRanking,
  normTitle,
  MIN_RANKINGS,
  type RankingList,
  type StoredRankedItem,
} from "@/lib/community-ranking";

// A consensus row, ready to render. Title/image come from the CURRENT items
// (not ranking-time snapshots), so the list always shows up-to-date names.
export interface CommunityRankingRow {
  itemId: string;
  title: string;
  imageUrl?: string;
  appearances: number;
}

export interface CommunityRankingPayload {
  rows: CommunityRankingRow[];
  totalRankings: number;
}

// A past-version ranking is included only if at least this fraction of its
// stored items maps onto the sorter's CURRENT items (by id, or by normalized
// title — edits re-create items with new ids, but titles usually survive).
// This is also the drift guard: if a creator replaced the sorter's contents
// wholesale, old rankings fall below the threshold and stay excluded.
const OVERLAP_THRESHOLD = 0.6;

// Identical anonymous rankings collapse into one voice only on sorters with at
// least this many items — below it, identical orderings occur honestly.
const BLOB_COLLAPSE_MIN_ITEMS = 8;

/**
 * Cheap dedup-aware size of a sorter's ranking pool: each logged-in user
 * counts ONCE, each anonymous browser (anonId) counts once, and legacy
 * anonymous rankings (no anonId) count individually — mirroring the dedup in
 * the aggregate below. A COUNT (milliseconds) — unlike the full aggregate —
 * so it's safe to await server-side; drives the unlock gate and the "X of 3"
 * locked-state copy. Optimistic: the full compute can still return null if
 * too few rankings survive the overlap filter or the identical-blob collapse.
 */
export async function getCommunityRankingPoolCount(
  sorterId: string,
): Promise<number> {
  const [row] = await db
    .select({
      c: sql<number>`(
        count(distinct "userId")
        + count(distinct "anonId") filter (where "userId" is null)
        + count(*) filter (where "userId" is null and "anonId" is null)
      )::int`,
    })
    .from(sortingResults)
    .where(eq(sortingResults.sorterId, sorterId));
  return row?.c ?? 0;
}

async function getCommunityRankingUncached(
  sorterId: string,
  version: number,
): Promise<CommunityRankingPayload | null> {
  // Aggregate rankings from ALL versions, mapped onto the current item set.
  // Editing a sorter re-creates its items with new ids, so past-version
  // rankings are joined by title snapshot; rankings that no longer overlap
  // enough with the current sorter (OVERLAP_THRESHOLD) are excluded, so a
  // wholesale-replaced sorter doesn't inherit a stale consensus.
  const [rows, items] = await Promise.all([
    db
      .select({
        rankings: sortingResults.rankings,
        userId: sortingResults.userId,
        anonId: sortingResults.anonId,
        createdAt: sortingResults.createdAt,
      })
      .from(sortingResults)
      .where(eq(sortingResults.sorterId, sorterId)),
    db
      .select({
        id: sorterItems.id,
        title: sorterItems.title,
        imageUrl: sorterItems.imageUrl,
      })
      .from(sorterItems)
      // Deliberately NOT filtered by version, matching the page/sort queries:
      // edit/finalize rewrites every row to the new version, so all rows ARE
      // the current set — except ~23 legacy sorters whose old edit flow left
      // items fragmented across versions (12 of them with zero rows at the
      // current version, which a version filter turns into a permanently-null
      // community ranking despite hundreds of results).
      .where(eq(sorterItems.sorterId, sorterId)),
  ]);

  if (items.length < 2) return null;

  const currentIds = new Set(items.map((i) => i.id));
  const meta = new Map(
    items.map((i) => [
      i.id,
      { title: i.title, imageUrl: i.imageUrl ?? undefined },
    ]),
  );
  // Title → current id, dropping ambiguous titles (two current items with the
  // same name): those can't be matched safely, so they only join by id.
  const titleToId = new Map<string, string>();
  const dupTitles = new Set<string>();
  for (const i of items) {
    const key = normTitle(i.title);
    if (dupTitles.has(key)) continue;
    if (titleToId.has(key)) {
      titleToId.delete(key);
      dupTitles.add(key);
    } else {
      titleToId.set(key, i.id);
    }
  }

  // One voice per identity: keep only the LATEST ranking per logged-in user
  // (userId) and per anonymous browser (anonId — localStorage id sent with the
  // submission). Legacy anonymous rankings predate anonId and can't be
  // attributed, so they count individually. Motivated by repeated reports of
  // replaying a sorter to sway the community ranking.
  const latestByUser = new Map<string, (typeof rows)[number]>();
  const latestByAnon = new Map<string, (typeof rows)[number]>();
  let anonRows: (typeof rows)[number][] = [];
  for (const row of rows) {
    if (row.userId) {
      const prev = latestByUser.get(row.userId);
      if (!prev || row.createdAt > prev.createdAt) {
        latestByUser.set(row.userId, row);
      }
    } else if (row.anonId) {
      const prev = latestByAnon.get(row.anonId);
      if (!prev || row.createdAt > prev.createdAt) {
        latestByAnon.set(row.anonId, row);
      }
    } else {
      anonRows.push(row);
    }
  }
  anonRows.push(...latestByAnon.values());

  // Identical-blob collapse: two anonymous submissions with the exact same
  // rankings JSON are one person (or a bot), not two voices — an attacker who
  // clears their anonId still submits the same ordering. Only applied when the
  // sorter has enough items that an identical full ordering can't happen by
  // honest coincidence (a 3-item sorter has just 6 possible orderings).
  if (items.length >= BLOB_COLLAPSE_MIN_ITEMS) {
    const latestByBlob = new Map<string, (typeof rows)[number]>();
    for (const row of anonRows) {
      const prev = latestByBlob.get(row.rankings);
      if (!prev || row.createdAt > prev.createdAt) {
        latestByBlob.set(row.rankings, row);
      }
    }
    anonRows = [...latestByBlob.values()];
  }

  const pool = [...anonRows, ...latestByUser.values()];

  const lists: RankingList[] = [];
  for (const row of pool) {
    let parsed: StoredRankedItem[];
    try {
      parsed = JSON.parse(row.rankings);
    } catch {
      continue; // skip a malformed blob rather than fail the whole aggregate
    }
    if (!Array.isArray(parsed) || parsed.length < 2) continue;

    const { list, overlap } = mapRanking(parsed, currentIds, titleToId);
    if (list.length >= 2 && overlap >= OVERLAP_THRESHOLD) lists.push(list);
  }

  const result = computeCommunityRanking(lists);
  if (!result) return null; // not enough included rankings yet

  const consensusRows: CommunityRankingRow[] = result.items.map((it) => {
    const m = meta.get(it.itemId);
    return {
      itemId: it.itemId,
      title: m?.title ?? "Untitled",
      imageUrl: m?.imageUrl,
      appearances: it.appearances,
    };
  });

  return { rows: consensusRows, totalRankings: result.totalRankings };
}

/**
 * Cached community ranking for a sorter. The aggregate barely moves ranking to
 * ranking (it's an average), so we cache for an hour — keeps the
 * O(items × rankings) recompute off the hot path while unlocks and updates
 * show up the same day. Combined with client-side fetching (the page never
 * awaits this), the rare recompute only spins the community section, never the
 * page. If the app grows to many high-play sorters, the next step is a daily
 * cron that precomputes these into a table so no request ever recomputes.
 */
export async function getCommunityRanking(
  sorterId: string,
  version: number,
): Promise<CommunityRankingPayload | null> {
  return unstable_cache(
    () => getCommunityRankingUncached(sorterId, version),
    // Keyed by version too: an edit changes the current item set, so it gets a
    // fresh aggregate — but past-version rankings still count toward it.
    ["community-ranking", sorterId, `v${version}`],
    { revalidate: 3600, tags: [`community-ranking-${sorterId}`] },
  )();
}
