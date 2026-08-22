/**
 * Community ranking — aggregates many individual rankings of a sorter into a
 * single consensus order.
 *
 * Method: percentile-normalized average placement, ignoring removals.
 *  - Each ranking is a full ordered list (best → worst) of the item ids the
 *    user kept. Items they removed mid-sort simply aren't in their list.
 *  - For each ranking, an item's position is normalized to a percentile
 *    `pos / (listLength - 1)` so 0 = best, 1 = worst — comparable across
 *    rankings of different lengths (filters, removals). `pos` is the item's
 *    0-based index, except tied items (a tie block) share their block's
 *    average index — a 2-way tie for first gives both items pos 0.5.
 *  - An item's score is the mean of its percentiles over the rankings it
 *    APPEARED in (removals are ignored, not counted as "last").
 *  - To avoid niche items (kept by very few) floating to the top, an item is
 *    only included if it appeared in at least `appearanceFloor` of all rankings.
 *  - Lower score = higher consensus rank.
 *
 * Why average-placement over pairwise: ~100× cheaper (O(items) vs O(items²))
 * with negligible quality difference for this use case, and "ignore removals"
 * + an appearance floor handles partial lists cleanly.
 */

/** One entry of a submitted ranking. */
export interface RankingEntry {
  id: string;
  /** 0-based position; tied items share their tie block's average index. */
  pos: number;
}

/** One submitted ranking: an ordered list of entries, best first. */
export type RankingList = RankingEntry[];

/**
 * Minimum rankings in the (deduplicated) pool before a community ranking
 * unlocks. Shared by the aggregator, the unlock gate, and the locked-state
 * copy on the sorter page. This module is pure (no db import), so client
 * components may import it.
 */
export const MIN_RANKINGS = 3;

export interface CommunityRankingItem {
  itemId: string;
  /** Mean percentile (0 best … 1 worst) over rankings this item appeared in. */
  score: number;
  /** How many rankings included this item. */
  appearances: number;
}

export interface CommunityRankingOptions {
  /**
   * Minimum total rankings before a community ranking is produced at all.
   * Below this, computeCommunityRanking returns null. Default 3.
   */
  minRankings?: number;
  /**
   * An item must appear in at least this fraction of rankings to be included.
   * Default 0.2 (20%).
   */
  appearanceFloor?: number;
}

export interface CommunityRankingResult {
  /** Full consensus order, best first. */
  items: CommunityRankingItem[];
  /** Number of rankings the consensus was aggregated from. */
  totalRankings: number;
}

/**
 * Aggregate individual rankings into a consensus order. Returns null when there
 * aren't enough rankings (< minRankings) to show a meaningful community ranking.
 *
 * Pure and deterministic — `rankings` is the only input that varies.
 */
export function computeCommunityRanking(
  rankings: RankingList[],
  options: CommunityRankingOptions = {},
): CommunityRankingResult | null {
  const minRankings = options.minRankings ?? MIN_RANKINGS;
  const appearanceFloor = options.appearanceFloor ?? 0.2;

  // Only consider rankings with at least 2 items (a 1-item list has no order).
  const valid = rankings.filter((r) => r.length >= 2);
  const totalRankings = valid.length;

  if (totalRankings < minRankings) return null;

  // Accumulate the sum of percentiles and the appearance count per item.
  const sum = new Map<string, number>();
  const count = new Map<string, number>();

  for (const list of valid) {
    const denom = list.length - 1; // guaranteed ≥ 1 (length ≥ 2)
    for (const { id, pos } of list) {
      const percentile = pos / denom; // 0 (best) … 1 (worst)
      sum.set(id, (sum.get(id) ?? 0) + percentile);
      count.set(id, (count.get(id) ?? 0) + 1);
    }
  }

  const minAppearances = totalRankings * appearanceFloor;

  const items: CommunityRankingItem[] = [];
  for (const [itemId, appearances] of count) {
    if (appearances < minAppearances) continue; // below the floor → excluded
    items.push({ itemId, appearances, score: sum.get(itemId)! / appearances });
  }

  // Best first: lowest score wins. Tiebreak: more appearances (more trusted),
  // then item id for a stable, deterministic order.
  items.sort(
    (a, b) =>
      a.score - b.score ||
      b.appearances - a.appearances ||
      a.itemId.localeCompare(b.itemId),
  );

  return { items, totalRankings };
}

/** Each element of a stored `rankings` JSON array. */
export interface StoredRankedItem {
  id: string;
  title: string;
  imageUrl?: string | null;
  /** Tied with the previous stored item (shared rank). */
  tiedWithPrev?: boolean;
}

export const normTitle = (t: string) => t.trim().toLowerCase();

/**
 * Map one stored ranking onto the current item set. Returns the mapped ordered
 * id list and the overlap fraction (mapped unique items / stored items).
 */
export function mapRanking(
  parsed: StoredRankedItem[],
  currentIds: Set<string>,
  titleToId: Map<string, string>,
): { list: RankingList; overlap: number } {
  const mapped: { id: string; group: number }[] = [];
  const seen = new Set<string>();
  let considered = 0;
  // Tie group per stored item: consecutive tiedWithPrev items share a group.
  // Tracked over ALL parsed elements (even unmappable ones) so a dropped
  // middle item doesn't split its tie block.
  let group = 0;

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (i > 0 && !item?.tiedWithPrev) group++;
    if (!item?.id) continue;
    considered++;
    // Same-version rankings match by id; past-version rankings (ids re-created
    // by edits) fall back to the title snapshot.
    const id = currentIds.has(item.id)
      ? item.id
      : item.title != null
        ? titleToId.get(normTitle(item.title))
        : undefined;
    // Dedupe within one ranking (two old items can map to one current item
    // via title) — keep the better (earlier) position.
    if (id && !seen.has(id)) {
      seen.add(id);
      mapped.push({ id, group });
    }
  }

  // Positions: 0-based index, except tie blocks (consecutive same-group runs —
  // groups are contiguous in stored order, so they stay contiguous here) share
  // their block's average index.
  const list: RankingList = [];
  for (let i = 0; i < mapped.length; ) {
    let j = i;
    while (j + 1 < mapped.length && mapped[j + 1].group === mapped[i].group) j++;
    const pos = (i + j) / 2;
    for (let k = i; k <= j; k++) list.push({ id: mapped[k].id, pos });
    i = j + 1;
  }

  return {
    list,
    overlap: considered > 0 ? list.length / considered : 0,
  };
}
