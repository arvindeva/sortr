# Tie / draw in the duel — design spec

**Status:** Approved in brainstorm (Aug 22 2026). Implementation: next focused session.
**Driver:** Feedback: "allow skip if you can't decide." The charasort lineage (the
Touhou sorter that inspired sortr) shows the right shape is a first-class **tie**,
not a defer-skip: the undecided user usually values both equally; a tie records
that honestly, produces shared ranks, and shortens the sort.

## Decisions (settled with user)

1. **Tie, not defer.** Third answer alongside left/right.
2. **UI: a small button below the VS marker** on the seam (hud-styled pill,
   e.g. "TIE"), pointer-events enabled only on itself (the marker stays
   decorative). Both breakpoints. The first-3-comparisons hint copy extends to
   mention it ("pick your favorite — or call a tie").
3. **Rank display: competition style 1, 2, 2, 4** (charasort-verified: rankNum
   freezes through tied neighbors, then jumps past them).

## Semantics (charasort-faithful)

- Choices map value becomes `winnerId | "__TIE__"`.
- On tie in a merge step: push BOTH compared items adjacently into the output,
  advance both runs, and link the two items' **tie groups** (groups merge if
  either side already has one).
- **Tie-mates travel together:** once tied items are adjacent in a run, when
  the run's head is placed (by winning or by being tied again), every
  consecutive tie-mate behind it is placed immediately with NO comparison.
  Ties therefore REDUCE remaining comparisons — the mechanic that makes this
  a completion-rate feature, not just a comfort.
- Progress: placements count normally (a tie places 2+ per question);
  totalBattles stays the worst-case constant, so the bar simply completes
  earlier. Undo snapshots must include the tie-group state.

## Storage (additive, backward-compatible)

- Stored ranking arrays gain an optional per-item `tiedWithPrev: true` flag
  (tie groups are always adjacent by construction). Old rankings: no flag,
  unchanged. Old readers ignore it.
- **Zod gotcha to verify explicitly:** the sorting-results submission schema
  must ADD the flag — zod strips unknown keys by default, which would silently
  drop ties at the API boundary. Verification must include a `select` of the
  stored JSON (post-photo-leak rule: check what LANDS, not what's sent).
- Saved-progress format: the serialized choices encoding gains a tie sentinel.
  Rollback behavior (old code reading a tie-bearing save): the tie pair
  deserializes to an unknown choice and gets re-asked — graceful; verify.

## Display surfaces (all show shared ranks, 1-2-2-4)

1. Rankings page rows (`rankings/[id]`) + the result reveal.
2. Share images (both variants — rank badges currently index+1; becomes
   computed competition rank).
3. Profile top-3 previews (rank labels).
4. Community ranking aggregation: tied blocks contribute the block's AVERAGE
   position to each member's percentile (not their arbitrary internal order).
   Old rankings without flags aggregate exactly as before. (The aggregate's
   own output has continuous scores — it never displays ties itself.)

**Medals under ties — the Olympic rule:** medals follow the RANK NUMBER, not
the position. Co-rank-1 items all get gold; a rank skipped by competition
numbering skips its medal (two golds → no silver, next is bronze at rank 3;
three golds → no silver, no bronze). Never mix medals within one tied block.
**Layout stays positional** where a layout demands it: the top-10 share
image's hero tile goes to the first-listed co-champion (both wear gold "1"
badges — size reads as layout, not verdict), and the top-10 cut slices
positionally even if a tie spans the 10/11 boundary.

## Out of scope

Keyboard hotkeys (charasort has them; mobile-first sortr defers), retroactive
tie-editing, partial-ranking view (parked separately).

## Verification sketch

Engine simulation (extend the estimator sim harness): tie mid-run → both
adjacent + shared group; tie-mate free placement (comparison count drops);
undo across a tie; save/resume with ties; rollback-format check. Then
end-to-end on staging: complete a run with ties → stored JSON carries flags →
rankings page + share image show 1-2-2-4 → community aggregate includes the
block-averaged positions.

## Rollback

Feature-revert is a code revert; stored `tiedWithPrev` flags in existing rows
are inert extra JSON keys to old readers. No migration.
