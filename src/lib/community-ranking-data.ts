import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sortingResults } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  computeCommunityRanking,
  type RankingList,
} from "@/lib/community-ranking";

// A consensus row, ready to render (carries the snapshot title/image so it's
// robust to later item edits/deletes).
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

// Each element of a stored `rankings` JSON array.
interface StoredRankedItem {
  id: string;
  title: string;
  imageUrl?: string | null;
}

async function getCommunityRankingUncached(
  sorterId: string,
  version: number,
): Promise<CommunityRankingPayload | null> {
  // Only aggregate rankings made against the sorter's CURRENT version. Editing
  // a sorter re-creates its items with new ids (and may change the item set),
  // so older rankings ranked a different thing — mixing them in produces an
  // incoherent result (duplicate items, stale entries). The community ranking
  // reflects the sorter as it is now.
  const rows = await db
    .select({ rankings: sortingResults.rankings })
    .from(sortingResults)
    .where(
      and(
        eq(sortingResults.sorterId, sorterId),
        eq(sortingResults.version, version),
      ),
    );

  const lists: RankingList[] = [];
  // Keep the most recent snapshot title/image per item id for display.
  const meta = new Map<string, { title: string; imageUrl?: string }>();

  for (const row of rows) {
    let parsed: StoredRankedItem[];
    try {
      parsed = JSON.parse(row.rankings);
    } catch {
      continue; // skip a malformed blob rather than fail the whole aggregate
    }
    if (!Array.isArray(parsed) || parsed.length < 2) continue;

    const ids: string[] = [];
    for (const item of parsed) {
      if (!item?.id) continue;
      ids.push(item.id);
      if (!meta.has(item.id)) {
        meta.set(item.id, {
          title: item.title ?? "Untitled",
          imageUrl: item.imageUrl ?? undefined,
        });
      }
    }
    if (ids.length >= 2) lists.push(ids);
  }

  const result = computeCommunityRanking(lists);
  if (!result) return null; // not enough rankings yet

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
 * Cached community ranking for a sorter. Recomputes at most every few minutes;
 * the aggregate changes slowly as new rankings trickle in, so a short stale
 * window is fine and keeps the (O(items × rankings)) pass off the hot path.
 */
export async function getCommunityRanking(
  sorterId: string,
  version: number,
): Promise<CommunityRankingPayload | null> {
  return unstable_cache(
    () => getCommunityRankingUncached(sorterId, version),
    // Keyed by version too, so an edit (new version) gets a fresh aggregate.
    ["community-ranking", sorterId, `v${version}`],
    { revalidate: 300, tags: [`community-ranking-${sorterId}`] },
  )();
}
