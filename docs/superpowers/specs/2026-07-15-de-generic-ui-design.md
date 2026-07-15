# De-generic UI pass: fonts, grid, glow shadows — design spec

**Status:** Approved (brainstormed Jul 15 2026). Implement on `development`.
**Driver:** Multiple sites now look near-identical to sortr because they share Claude's default design vocabulary. The three tells identified: the font stack (Space Grotesk / Space Mono are the strongest AI signatures), the magenta glow button shadow, and the faint 48px grid background. Goal: keep the VERSUS-arcade identity, layout, and colors exactly as-is; replace or remove the generic executions.

## Decisions (settled)

1. **Fonts: replace all three faces**, keep the three-role system (display / HUD mono / body). Source: any free foundry — the chosen trio is "quiet broadcast" (rejected: A "esports scoreboard" Khand/Martian/Schibsted — user preferred less gamey; B "louder arcade" Tanker/Azeret/Familjen — too wide for long fandom names).
2. **Grid background: remove entirely**, no replacement texture. Corner atmosphere radials stay.
3. **Glow shadows: remove from buttons and the duel-machine panel**, no replacement shadow treatment. Brand pulse animations (VS marker, logo square) and comparison-card hover glows stay. Applies to both themes (light mode's colored-shadow equivalents go too).

## 1. Typography — self-hosted "quiet broadcast" trio

| Role | Old (Google) | New (self-hosted) | Source | License |
|---|---|---|---|---|
| Display (`--font-heading`) | Big Shoulders 800–900 | **League Gothic** (single weight) | theleagueofmoveabletype.com | SIL OFL |
| HUD mono (`--font-mono`) | Space Mono 400/700 | **League Mono** 400/700 | theleagueofmoveabletype.com | SIL OFL |
| Body (`--font-base`) | Space Grotesk 400–700 | **Mona Sans** variable 200–900 | github.com/github/mona-sans | SIL OFL |

- Files ship in the repo as woff2 (convert from OTF/TTF if the foundry doesn't provide woff2), wired via `next/font/local` in `src/app/layout.tsx`, keeping the current explicit-fallback + no-adjustFontFallback approach.
- The `next/font/google` import is deleted — zero Google Fonts touchpoints remain.
- Font CSS variables renamed to match the new faces (`--font-league-gothic`, `--font-league-mono`, `--font-mona-sans`); the three `--font-base/heading/mono` mappings in `globals.css` and the inline `fontFamily` in `layout.tsx` updated.
- **Single-weight display handling (the one sharp edge):** League Gothic has no 800/900. `--font-weight-heading` drops 800 → 400; explicit `font-black`/`font-extrabold`/`font-bold` on heading-font text is removed; `font-synthesis-weight: none` is set globally so browsers can never fake-bold it. The face is inherently bold-condensed.
- Expected visual drift: wordmark and cover-tile names render slightly narrower/sharper. Size nudges during visual QA are allowed; no component or layout changes.

## 2. Grid removal — all four sites

- `src/app/globals.css`: delete the two grid `linear-gradient` layers + `background-size: 48px 48px` from the atmosphere layer, and both `--atmo-grid-line` tokens (dark + light). Radial glows (`--atmo-glow`) stay.
- `src/components/ui/arcade-background.tsx`: update the docstring (no grid).
- `src/components/navbar.tsx` (~line 304): delete the mobile menu sheet's own 48px grid overlay.
- `src/components/result-share-image.tsx` (~line 616): delete the grid painted into the generated share PNG — the shared image is exactly where lookalike-spotting happens. Card keeps its dark bg and accent styling.

## 3. Glow shadows off — buttons + panel, both themes

- `src/components/ui/button.tsx`: default variant drops `shadow-[0_6px_18px_rgba(255,46,126,.35)]` (one class, covers both themes). Gradient and `hover:brightness-110` stay.
- `--panel-glow` token (dark blur ring + light colored shadow in `globals.css`) deleted along with its usages on the duel-machine panel. Magenta border stays.
- **Kept:** VS-marker pulse (`--vs-pulse-*`), logo `sortrGlow`, comparison-card hover glows, atmosphere radials.

## 4. Docs updated with the code

- `CLAUDE.md` (canonical brand spec): Type section (new faces + "self-hosted, never Google-default families"), atmosphere line (no grid), mobile-menu description (no grid), primary-button description (no glow shadow), elevated-panel description (no halo), light-mode token map (deleted entries).
- `docs/design-system.md`: same corrections in the implementation notes.

## Not changing

Layout, spacing, color tokens, accent cycling, cover-tile design, all motion keyframes, the light-mode token map beyond deleted entries, OG images.

## Verification

- Visual pass in both themes: home, browse, sorter page, duel screen, results/rankings page, mobile nav sheet.
- No synthetic bold: headings render at weight 400; spot-check computed styles on the wordmark and a card title.
- Network tab: exactly the self-hosted woff2 files load; no `fonts.googleapis.com`/`fonts.gstatic.com` requests.
- Generate both share-image variants: card looks intentional without the grid.
- `npm run build` passes.

## Rollback

Single revert — font files are additive, everything else is token/class deletions. No schema, no API changes.
