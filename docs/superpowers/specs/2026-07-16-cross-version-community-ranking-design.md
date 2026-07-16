# Cross-version community ranking (Stage 1) — design spec

**Status:** Approved (settled in conversation Jul 16 2026). Implement inline on `development`.
**Driver:** Third community-ranking confusion report in two weeks. Latest: fairy-tail-characters-s9zoe — 88 plays but version 9 (eight edits on day one), so the version-keyed aggregate never reaches the minimum. Editing a sorter re-creates items with new ids, which is why aggregation was version-pinned. Also bundles two dials: unlock minimum 10 → **3** (user's call; noisier early consensus accepted) and cache revalidate 24h → **1h** (killer-peter staleness).

## Decisions (settled)

1. **Include past-version rankings** in the aggregate by mapping their stored items onto the CURRENT item set: match by item id first (current-version rankings map 1:1), then by normalized title (`trim().toLowerCase()`) against current items — every stored ranking carries `{id, title, imageUrl}` snapshots, so this works retroactively on all existing rows.
2. **Overlap threshold = 0.6:** a past ranking is included only if ≥60% of its stored items map onto current items. This is the drift guard — a gutted/replaced sorter's old rankings simply don't qualify. (Tunable constant.)
3. **Ambiguous titles excluded from the fallback:** if a normalized title matches 2+ current items, that title maps to nothing (id matches still work). Within one mapped ranking, if two stored items map to the same current id, keep the better (earlier) position, drop the rest.
4. **Display metadata comes from CURRENT items** (title/imageUrl from `sorterItems` at the current version), not stored snapshots — fixes stale names/images in the consensus list as a side effect.
5. **MIN_RANKINGS 10 → 3** (both `MIN_RANKINGS` in community-ranking-data.ts and the default in computeCommunityRanking — they must stay matched). Count = INCLUDED rankings (post-mapping, ≥2 mapped items each).
6. **`hasCommunityRanking` gate goes version-agnostic** (count all rankings for the sorter ≥ 3). Optimistic: the gate can pass while the full compute (with overlap filtering) still returns null — the section skeleton then resolves to nothing. Rare (requires most rankings failing overlap) and acceptable until the "X/N to unlock" empty state ships.
7. **Cache: revalidate 86400 → 3600.** Key stays `["community-ranking", sorterId, v{version}]` — the result depends on the current item set, so an edit still recomputes; it just no longer resets the pool.
8. Appearance floor (0.2) and the percentile math are unchanged — they already handle heterogeneous lists (tag-filtered plays).

## Mechanics

`src/lib/community-ranking-data.ts` (the bulk):
- Fetch rankings by `sorterId` only (drop the version predicate).
- Fetch current items: `select id, title, imageUrl from sorterItems where sorterId = ? and version = <current>`. Pass the sorter's current version in (signature already takes it).
- Build: `currentIds: Set<string>`, `titleToId: Map<norm(title) → id>` (delete collisions), `meta: Map<id → {title, imageUrl}>` from current items.
- Per stored ranking: map each stored item → current id (id match, else title match); dedupe by mapped id keeping first occurrence; compute `overlap = mappedUnique / storedCount`; include as a RankingList if `overlap ≥ 0.6` and `mapped ≥ 2`.
- `hasCommunityRanking`: drop the version predicate from the count.

`src/lib/community-ranking.ts`: default `minRankings` 10 → 3 (comment updated).

## Verification

- Simulation script (tsx) against synthetic data: id-matching, title-fallback after simulated "edit re-created ids", overlap rejection of a gutted sorter, duplicate-title exclusion, dedupe-within-ranking, min=3 boundary (2 → null, 3 → result).
- Real-data check against the STAGING DB (local env): run the uncached function for a multi-version staging sorter and confirm included counts rise vs the version-pinned query.
- `npx tsc --noEmit`; dev-server curl of a sorter page + community-ranking API.

## Not changing

Stage 2 (preserving item ids through edits) stays on the roadmap — this change makes it unnecessary for aggregation correctness but still worth it for lineage-through-renames. The unlock-progress empty state and edit-flow warning are separate small tasks.

## Rollback

Single revert; no schema change; cache keys unchanged (stale cached nulls expire within 1h).
