/**
 * Community ranking — aggregates many individual rankings of a sorter into a
 * single consensus order.
 *
 * Method: percentile-normalized average placement, ignoring removals.
 *  - Each ranking is a full ordered list (best → worst) of the item ids the
 *    user kept. Items they removed mid-sort simply aren't in their list.
 *  - For each ranking, an item's position is normalized to a percentile
 *    `(index) / (listLength - 1)` so 0 = best, 1 = worst — comparable across
 *    rankings of different lengths (filters, removals).
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

/** One submitted ranking: an ordered list of item ids, best first. */
export type RankingList = string[];

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
   * Below this, computeCommunityRanking returns null. Default 10.
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
  const minRankings = options.minRankings ?? 10;
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
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      const percentile = i / denom; // 0 (best) … 1 (worst)
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
