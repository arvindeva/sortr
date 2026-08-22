/**
 * Competition ("Olympic") ranking over a stored ranking's tie flags:
 * tied items share a rank, the next untied item takes its positional rank —
 * 1, 2, 2, 4. Medals follow the RANK NUMBER, so a skipped rank skips its
 * medal (two golds → no silver). Pure; safe for client and server.
 */

export function computeCompetitionRanks(
  items: { tiedWithPrev?: boolean }[],
): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < items.length; i++) {
    ranks.push(i > 0 && items[i]?.tiedWithPrev ? ranks[i - 1] : i + 1);
  }
  return ranks;
}

/** Medal CSS var for a competition rank, or undefined past the podium. */
export function medalForRank(rank: number): string | undefined {
  if (rank === 1) return "var(--medal-gold)";
  if (rank === 2) return "var(--medal-silver)";
  if (rank === 3) return "var(--medal-bronze)";
  return undefined;
}
