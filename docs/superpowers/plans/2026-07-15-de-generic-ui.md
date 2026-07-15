# De-generic UI Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three "vibe-coded" tells — the Google font trio, the 48px grid background, and the magenta glow shadows — with a self-hosted font stack and clean deletions, keeping layout/colors/motion identical.

**Architecture:** The design system is fully tokenized, so this is a token-swap: three `next/font/local` faces wired into the existing `--font-*` variables, plus targeted deletions of the grid layers and glow shadows. No component APIs or layouts change.

**Tech Stack:** Next.js 15 App Router, Tailwind v4 (`@theme inline` tokens in `src/app/globals.css`), `next/font/local`.

**Spec:** `docs/superpowers/specs/2026-07-15-de-generic-ui-design.md`

## Global Constraints

- Work on the `development` branch. No layout, spacing, color, or component-API changes.
- Fonts MUST stay in the `--font-*` token namespace (NOT `--font-family-*`) — Tailwind v4 generates `font-*` utilities from `--font-*` and silently no-ops otherwise.
- League Gothic is **single-weight**. Never add synthetic bolding back; `font-synthesis-weight: none` must remain on `html`.
- Do NOT touch: `--atmo-glow` radials, `--vs-pulse-*`, `.sortr-glow`/`sortrGlow`, comparison-card hover glow shadows (`src/components/ui/comparison-card.tsx`), the light-mode ink tokens.
- `npm run build` note: a `Failed query`/connection error from `sitemap.xml` during build is a known local staging-DB flake — ignore it; the build itself must still finish with "Compiled successfully".
- Commit after each task.

---

### Task 1: Vendor the three font files

**Files:**
- Create: `src/app/fonts/LeagueGothic-Regular.woff2`
- Create: `src/app/fonts/LeagueMono-Regular.woff2`
- Create: `src/app/fonts/LeagueMono-Bold.woff2`
- Create: `src/app/fonts/MonaSansVF.woff2`
- Create: `src/app/fonts/LICENSES.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the four woff2 files at the exact paths above — Task 2's `next/font/local` calls reference them as `./fonts/<name>.woff2` relative to `src/app/layout.tsx`.

- [ ] **Step 1: Download and extract (URLs and archive paths verified 2026-07-15)**

```bash
cd /home/rveen/dev/sortr
mkdir -p src/app/fonts
TMP=$(mktemp -d)
curl -sL -o "$TMP/lg.zip" "https://github.com/theleagueof/league-gothic/releases/download/1.601/LeagueGothic-1.601.zip"
curl -sL -o "$TMP/lm.zip" "https://github.com/theleagueof/league-mono/releases/download/2.300/LeagueMono-2.300.zip"
curl -sL -o src/app/fonts/MonaSansVF.woff2 "https://raw.githubusercontent.com/github/mona-sans/main/fonts/webfonts/variable/MonaSansVF%5Bopsz%2Cwght%5D.woff2"
python3 - "$TMP" <<'PY'
import sys, zipfile
tmp = sys.argv[1]
jobs = [
    (tmp + "/lg.zip", "LeagueGothic-1.601/static/WOFF2/LeagueGothic-Regular.woff2", "src/app/fonts/LeagueGothic-Regular.woff2"),
    (tmp + "/lm.zip", "LeagueMono-2.300/static/WOFF2/LeagueMono-Regular.woff2", "src/app/fonts/LeagueMono-Regular.woff2"),
    (tmp + "/lm.zip", "LeagueMono-2.300/static/WOFF2/LeagueMono-Bold.woff2", "src/app/fonts/LeagueMono-Bold.woff2"),
]
for zpath, member, dest in jobs:
    open(dest, "wb").write(zipfile.ZipFile(zpath).read(member))
    print("wrote", dest)
PY
```

- [ ] **Step 2: Verify the files are genuine woff2 at the expected sizes**

```bash
python3 - <<'PY'
import os
expected = {
    "src/app/fonts/LeagueGothic-Regular.woff2": 12268,
    "src/app/fonts/LeagueMono-Regular.woff2": 26724,
    "src/app/fonts/LeagueMono-Bold.woff2": 26792,
    "src/app/fonts/MonaSansVF.woff2": 137252,
}
for path, size in expected.items():
    magic = open(path, "rb").read(4)
    assert magic == b"wOF2", f"{path}: bad magic {magic}"
    actual = os.path.getsize(path)
    # Upstream may re-release; sizes within 20% are fine, zero/HTML error pages are not.
    assert abs(actual - size) < size * 0.2, f"{path}: suspicious size {actual} (expected ~{size})"
    print("OK", path, actual, "bytes")
PY
```

Expected: four `OK` lines. If a download produced an HTML error page, the magic-byte assert fires — re-run Step 1.

- [ ] **Step 3: Write the license note**

Create `src/app/fonts/LICENSES.md`:

```markdown
# Font licenses

All three families are licensed under the SIL Open Font License 1.1 and are
free for commercial use, self-hosting included.

- **League Gothic** 1.601 — The League of Moveable Type.
  https://github.com/theleagueof/league-gothic (OFL.md in repo)
- **League Mono** 2.300 — Tyler Finck / The League of Moveable Type.
  https://github.com/theleagueof/league-mono (OFL.md in repo)
- **Mona Sans** (variable, `MonaSansVF[opsz,wght].woff2` renamed to
  `MonaSansVF.woff2`) — GitHub. https://github.com/github/mona-sans
  (LICENSE in repo)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/fonts
git commit -m "Vendor League Gothic, League Mono, Mona Sans woff2 (OFL)"
```

---

### Task 2: Wire the new typography

**Files:**
- Modify: `src/app/layout.tsx:1-37` (font imports/definitions), `:90-91` (body className + inline fontFamily)
- Modify: `src/app/globals.css:239-246` (@theme font tokens), `:252-254` (html block), `:264-267` (.display comment), `:287` (.hud comment)

**Interfaces:**
- Consumes: the four woff2 files from Task 1 at `src/app/fonts/`.
- Produces: CSS variables `--font-league-gothic`, `--font-league-mono`, `--font-mona-sans` on `<body>`; Tailwind utilities `font-heading`/`font-mono`/`font-base` resolve to the new faces. Later tasks and all existing components rely on these utility names being unchanged.

- [ ] **Step 1: Replace the font setup in `src/app/layout.tsx`**

Replace lines 1-37 (imports + three font constants). Old:

```tsx
import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Space_Mono, Space_Grotesk } from "next/font/google";
```

…through the `spaceGrotesk` constant. New:

```tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArcadeBackground } from "@/components/ui/arcade-background";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

import "./globals.css";

// Display / headings / wordmark / numbers — condensed, loud, uppercase.
// League Gothic ships a single weight; font-synthesis-weight:none (globals.css)
// keeps browsers from faking heavier ones. Explicit fallback +
// adjustFontFallback:false mirrors the previous setup (no derived metrics).
const leagueGothic = localFont({
  src: "./fonts/LeagueGothic-Regular.woff2",
  variable: "--font-league-gothic",
  display: "swap",
  weight: "400",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
});

// HUD / labels / meta / counters — the scoreboard voice.
const leagueMono = localFont({
  src: [
    { path: "./fonts/LeagueMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/LeagueMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-league-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// Body / UI — variable 200–900.
const monaSans = localFont({
  src: "./fonts/MonaSansVF.woff2",
  variable: "--font-mona-sans",
  display: "swap",
  weight: "200 900",
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});
```

(The `metadata` export and everything after stays untouched.)

- [ ] **Step 2: Update the `<body>` wiring in `src/app/layout.tsx` (~lines 89-91)**

Old:

```tsx
        className={`${bigShoulders.variable} ${spaceMono.variable} ${spaceGrotesk.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-space-grotesk)" }}
```

New:

```tsx
        className={`${leagueGothic.variable} ${leagueMono.variable} ${monaSans.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-mona-sans)" }}
```

- [ ] **Step 3: Update the font tokens in `src/app/globals.css` (@theme block, lines 239-246)**

Old:

```css
  --font-weight-base: 400;
  --font-weight-heading: 800;
  /* font-base = body (Space Grotesk), font-heading = display (Big Shoulders),
     font-mono = HUD (Space Mono). NOTE: must be the --font-* namespace, not
     --font-family-*, or the font-* utilities silently no-op in Tailwind v4. */
  --font-base: var(--font-space-grotesk);
  --font-heading: var(--font-big-shoulders);
  --font-mono: var(--font-space-mono);
```

New:

```css
  --font-weight-base: 400;
  /* League Gothic ships one weight — 400 keeps headings from requesting a bold
     that doesn't exist (font-synthesis-weight:none on html guards the rest). */
  --font-weight-heading: 400;
  /* font-base = body (Mona Sans), font-heading = display (League Gothic),
     font-mono = HUD (League Mono). NOTE: must be the --font-* namespace, not
     --font-family-*, or the font-* utilities silently no-op in Tailwind v4. */
  --font-base: var(--font-mona-sans);
  --font-heading: var(--font-league-gothic);
  --font-mono: var(--font-league-mono);
```

- [ ] **Step 4: Disable synthetic bold globally (`src/app/globals.css`, html block ~line 252)**

Old:

```css
  html {
    @apply bg-background;
  }
```

New:

```css
  html {
    @apply bg-background;
    /* League Gothic has no bold cut — never let the browser smear a fake one.
       Weight utilities (font-black etc.) on display text are inert by design. */
    font-synthesis-weight: none;
  }
```

- [ ] **Step 5: Fix the two stale face names in comments (`src/app/globals.css`)**

Line ~264: `Display headings: Big Shoulders is a condensed face, so it wants tight` → `Display headings: League Gothic is a condensed face, so it wants tight`

Line ~287: `/* HUD / scoreboard text: Space Mono, uppercase, wide tracking. */` → `/* HUD / scoreboard text: League Mono, uppercase, wide tracking. */`

- [ ] **Step 6: Verify no stale references, then build**

```bash
grep -rn "next/font/google\|space-grotesk\|big-shoulders\|space-mono\|Space_Grotesk\|Big_Shoulders\|Space_Mono" src/
```

Expected: no matches (exit code 1).

```bash
npm run build
```

Expected: "Compiled successfully" (sitemap DB flake ignorable per Global Constraints).

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "Swap font stack to self-hosted League Gothic / League Mono / Mona Sans"
```

---

### Task 3: Remove the 48px grid + repoint orphaned font vars

**Files:**
- Modify: `src/app/globals.css` (dark token :78, light comment+token :154-165, atmosphere comment ~:294, delete `::after` block :305-317)
- Modify: `src/components/ui/arcade-background.tsx:1-5` (docstring)
- Modify: `src/components/navbar.tsx:304-313` (menu-sheet grid overlay)
- Modify: `src/components/result-share-image.tsx` (share-card grid layer ~:611-619; AND 12 old `--font-*` var refs)
- Modify: `src/components/admin-charts.tsx:48` (one old `--font-*` var ref)

**Interfaces:**
- Consumes: the new font CSS variables defined in Task 2 (`--font-league-gothic`, `--font-league-mono`, `--font-mona-sans`).
- Produces: `--atmo-grid-line` no longer exists — nothing may reference it afterward. No `--font-big-shoulders`/`--font-space-mono`/`--font-space-grotesk` references remain in any component.

**Why the font-var steps are here:** Task 2 repointed the `@theme` tokens, but two components (`result-share-image.tsx`, `admin-charts.tsx`) hardcode the *old* CSS variable names in inline `fontFamily` styles, so they now resolve to nothing and fall back to system fonts. Task 3 already edits `result-share-image.tsx`, so the repointing rides along here. The mapping is a pure 1:1 rename: `--font-big-shoulders`→`--font-league-gothic`, `--font-space-mono`→`--font-league-mono`, `--font-space-grotesk`→`--font-mona-sans`.

- [ ] **Step 1: `src/app/globals.css` — delete the grid tokens**

Delete line 78 in the `:root.dark` block: `--atmo-grid-line: rgba(255, 255, 255, 0.03);`

In the `:root` (light) block, change the comment `/* Atmosphere: glows at ~⅓ strength, grid as faint ink lines. */` → `/* Atmosphere: glows at ~⅓ strength. */` and delete `--atmo-grid-line: rgba(22, 16, 52, 0.045);`

- [ ] **Step 2: `src/app/globals.css` — delete the grid layer**

Change the comment `/* Page atmosphere: radial neon glows + faint grid, painted behind content.` → `/* Page atmosphere: radial neon glows painted behind content.` and delete this entire block:

```css
  .arcade-atmosphere::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
        var(--atmo-grid-line) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, var(--atmo-grid-line) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }
```

(Keep `.arcade-atmosphere::before` — that's the radial glows.)

- [ ] **Step 3: `src/components/ui/arcade-background.tsx` — docstring**

Old: `* The fixed page atmosphere for the VERSUS arcade look: radial magenta + cyan` / `* glows and a faint 48px grid, painted behind all content. Rendered once in the`

New: `* The fixed page atmosphere for the VERSUS arcade look: radial magenta + cyan` / `* glows painted behind all content. Rendered once in the`

- [ ] **Step 4: `src/components/navbar.tsx` — delete the menu-sheet grid (lines 304-313)**

Delete exactly:

```tsx
        {/* faint 48px grid on the panel — tracks the active theme */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--atmo-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--atmo-grid-line) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
```

- [ ] **Step 5: `src/components/result-share-image.tsx` — delete the share-card grid (lines 611-619)**

Delete exactly:

```tsx
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
```

(Keep the two radial-gradient divs directly above it — those are the card's magenta/cyan glows.)

- [ ] **Step 6: `src/components/result-share-image.tsx` — repoint the old font vars**

This file references the OLD font CSS variables in ~12 inline `fontFamily` styles (it predates the `@theme` tokens). Repoint each to the Task 2 replacement — a pure find/replace across the whole file, no other text changes:

```bash
sed -i \
  -e 's/--font-big-shoulders/--font-league-gothic/g' \
  -e 's/--font-space-mono/--font-league-mono/g' \
  -e 's/--font-space-grotesk/--font-mona-sans/g' \
  src/components/result-share-image.tsx
```

Then confirm the count changed and nothing old remains in this file:

```bash
grep -c "font-league-gothic\|font-league-mono\|font-mona-sans" src/components/result-share-image.tsx
grep -n "font-big-shoulders\|font-space-mono\|font-space-grotesk" src/components/result-share-image.tsx
```

Expected: first command prints `12`; second prints nothing (exit 1).

- [ ] **Step 7: `src/components/admin-charts.tsx` — repoint the one font var (line ~48)**

Old: `  fontFamily: "var(--font-space-mono)",`
New: `  fontFamily: "var(--font-league-mono)",`

- [ ] **Step 8: Verify and build**

```bash
grep -rn "atmo-grid-line\|48px 48px" src/
grep -rn "font-big-shoulders\|font-space-mono\|font-space-grotesk" src/
```

Expected: both return no matches (exit 1). (Note: `src/lib/og-generic.tsx` + `src/app/_og-fonts/*.ttf` use a SEPARATE Satori disk-font pipeline with its own `.ttf` files and face-name strings — NOT the `--font-*` CSS vars — and is intentionally out of scope per the spec's "Not changing: OG images". Do not touch it; the grep above won't match it.)

```bash
npm run build
```

Expected: "Compiled successfully" (sitemap DB flake ignorable).

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/ui/arcade-background.tsx src/components/navbar.tsx src/components/result-share-image.tsx src/components/admin-charts.tsx
git commit -m "Remove the 48px grid + repoint orphaned font vars to the new stack"
```

---

### Task 4: Remove the glow shadows (buttons + duel panel)

**Files:**
- Modify: `src/components/ui/button.tsx:13-15`
- Modify: `src/app/globals.css` (dark `--panel-glow` :55, light comment+token :139-142)
- Modify: `src/components/hero-duel.tsx:295`

**Interfaces:**
- Consumes: nothing from other tasks (independent).
- Produces: `--panel-glow` no longer exists — nothing may reference it afterward. Button variants keep their existing names (`default`, `noShadow`, `reverse` become visually near-identical; they are intentionally NOT consolidated — call sites are out of scope).

- [ ] **Step 1: `src/components/ui/button.tsx` — drop the glow from the default variant**

Old (lines 13-15):

```tsx
        // Magenta-gradient primary with a magenta glow shadow.
        default:
          "bg-[image:var(--main-gradient)] text-main-foreground shadow-[0_6px_18px_rgba(255,46,126,.35)] hover:brightness-110",
```

New:

```tsx
        // Magenta-gradient primary, flat (no glow shadow).
        default:
          "bg-[image:var(--main-gradient)] text-main-foreground hover:brightness-110",
```

- [ ] **Step 2: `src/app/globals.css` — delete the panel glow tokens**

In `:root.dark` delete line 55: `--panel-glow: 0 0 60px rgba(255, 46, 126, 0.18);`

In `:root` (light), change the comment `/* Elevated panel: white with a soft magenta shadow (no glow). */` → `/* Elevated panel: white, flat. */` and delete `--panel-glow: 0 16px 44px rgba(255, 46, 126, 0.16);`

- [ ] **Step 3: `src/components/hero-duel.tsx` — drop the panel halo (line 295)**

Delete the line `boxShadow: "var(--panel-glow)",` (keep `borderColor` and `background` on lines 293-294).

- [ ] **Step 4: Verify and build**

```bash
grep -rn "panel-glow\|0_6px_18px_rgba(255,46,126" src/
```

Expected: no matches (exit 1).

```bash
npm run build
```

Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/app/globals.css src/components/hero-duel.tsx
git commit -m "Remove magenta glow shadows from buttons and duel panel"
```

---

### Task 5: Update the design docs

**Files:**
- Modify: `CLAUDE.md` (Type section, atmosphere/panel lines, component descriptions, light-mode map, implementation pointers)
- Modify: `docs/design-system.md` (:42, :48-50, :57-68, :72-74, :78-79, :99-102, :117-121)

**Interfaces:**
- Consumes: the final state of Tasks 1-4 (docs must describe what shipped).
- Produces: docs matching the implementation; CLAUDE.md remains the canonical brand spec.

- [ ] **Step 1: `CLAUDE.md` edits (exact old → new)**

1. `- Atmosphere (on bg): radial magenta glow top-right \`rgba(255,46,126,.18)\` + cyan glow left \`rgba(25,227,223,.11)\`; faint 48px grid \`rgba(255,255,255,.03)\`` → `- Atmosphere (on bg): radial magenta glow top-right \`rgba(255,46,126,.18)\` + cyan glow left \`rgba(25,227,223,.11)\``
2. `- Elevated panel (duel machine): \`linear-gradient(180deg, rgba(22,18,46,.9), rgba(12,10,28,.95))\`, border \`rgba(255,46,126,.4)\`, glow \`0 0 60px rgba(255,46,126,.18)\`` → `- Elevated panel (duel machine): \`linear-gradient(180deg, rgba(22,18,46,.9), rgba(12,10,28,.95))\`, border \`rgba(255,46,126,.4)\` (flat — no glow)`
3. Replace the whole Type section:

```markdown
## Type (self-hosted woff2 via next/font/local — files in src/app/fonts/)
- Display / headings / wordmark: **League Gothic** (single weight), `text-transform:uppercase`, tight line-height (.88–1). No bold cut exists; `font-synthesis-weight:none` is set globally, so weight utilities on display text are inert by design.
- HUD / labels / meta / numbers / placeholders: **League Mono** 400/700, uppercase, `letter-spacing:.08–.16em`
- Body / UI: **Mona Sans** (variable 200–900)
Never use generic Inter/Arial/Roboto — and never the former AI-default trio (Big Shoulders, Space Mono, Space Grotesk).
```

4. Logo line: `+ wordmark \`SORTR\` (Big Shoulders 900, ~30px)` → `+ wordmark \`SORTR\` (League Gothic, ~30px)`
5. VS marker line: `"VS" in Big Shoulders magenta` → `"VS" in League Gothic magenta`
6. Mobile nav: `panel \`linear-gradient(180deg,#120f24,#0b0918)\` + the 48px grid` → `panel \`linear-gradient(180deg,#120f24,#0b0918)\``, and `Big Shoulders 26px uppercase rows` → `League Gothic 26px uppercase rows`
7. Primary button: `magenta gradient, white, Big Shoulders 800 uppercase (or Space Grotesk 700 for small), radius 6–8, magenta shadow.` → `magenta gradient, white, League Gothic uppercase (or Mona Sans 700 for small), radius 6–8, flat (no glow shadow).`
8. Card: `with the item NAME in Big Shoulders` → `with the item NAME in League Gothic`
9. Light-mode map: delete the line `- grid lines \`rgba(255,255,255,.03)\` → \`rgba(22,16,52,.045)\``; change `- elevated panel gradient → \`#ffffff\`; its glow \`0 0 60px rgba(255,46,126,.18)\` → shadow \`0 16px 44px rgba(255,46,126,.16)\`` → `- elevated panel gradient → \`#ffffff\` (flat in both themes)`
10. Implementation pointers: `- Fonts: \`src/app/layout.tsx\`, wired through the \`--font-*\` namespace.` → `- Fonts: self-hosted woff2 in \`src/app/fonts/\` (see its LICENSES.md), loaded in \`src/app/layout.tsx\` via \`next/font/local\`, wired through the \`--font-*\` namespace.`

- [ ] **Step 2: `docs/design-system.md` edits (exact old → new)**

1. Line 42: `| \`--panel-border\` | \`rgba(255,46,126,.4)\` | + \`--panel-glow\` \`0 0 60px rgba(255,46,126,.18)\` |` → `| \`--panel-border\` | \`rgba(255,46,126,.4)\` | elevated panel border (flat — no glow) |`
2. Lines 49-50: `radial magenta` / `glow top-right + cyan glow left + a faint 48px grid.` → `radial magenta` / `glow top-right + cyan glow left.`
3. Type section (lines 59-68), replace the three face bullets:

```markdown
- **Display / headings / wordmark / numbers:** League Gothic (`font-heading`),
  single weight, uppercase, tight leading. Use the `.display` utility for the
  full loud treatment. No bold cut exists — `font-synthesis-weight: none` on
  `html` keeps browsers from faking one, so weight utilities on display text
  are inert.
- **HUD / labels / meta / counters:** League Mono 400/700 (`font-mono`). Use
  the `.hud` utility for uppercase + wide tracking.
- **Body / UI:** Mona Sans, variable 200–900 (`font-base`, the body default).
- All three are self-hosted woff2 (SIL OFL) in `src/app/fonts/`, loaded via
  `next/font/local` in `src/app/layout.tsx`.
```

(Keep the existing `--font-*` namespace warning bullet unchanged.)

4. Logo line 73: `("SORTR", display 900)` → `("SORTR", display)`
5. Button line 78: `- **Button:** magenta-gradient primary;` → `- **Button:** magenta-gradient primary (flat — no glow shadow);`
6. Light-mode rule line 101: `**turn every glow into a crisp colored shadow** (no blur rings), and **deepen` → `**swap the VS-pulse glow for a crisp colored shadow** (no blur rings), and **deepen`
7. Lines 118-121: `soft shadow \`0 6px 16px rgba(22,16,52,.06)\`; panel white + magenta shadow (no` / `glow); atmosphere glows at ~⅓ strength; grid \`rgba(22,16,52,.045)\`; text primary` / `\`#17132e\` / muted \`#5a5478\`. The VS-marker pulse and panel glow swap to soft` / `drop shadows via the \`--vs-pulse-*\` and \`--panel-glow\` tokens. Medals unchanged.` → `soft shadow \`0 6px 16px rgba(22,16,52,.06)\`; panel white (flat); atmosphere` / `glows at ~⅓ strength; text primary \`#17132e\` / muted \`#5a5478\`. The VS-marker` / `pulse swaps to a soft drop shadow via the \`--vs-pulse-*\` tokens. Medals unchanged.`

- [ ] **Step 3: Verify no stale mentions**

```bash
grep -n "Big Shoulders\|Space Mono\|Space Grotesk\|48px grid\|panel-glow\|Google Fonts" CLAUDE.md docs/design-system.md
```

Expected: only the deliberate "never the former AI-default trio (Big Shoulders, Space Mono, Space Grotesk)" line in CLAUDE.md.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/design-system.md
git commit -m "Docs: new font stack, grid and glow removals"
```

---

## Final verification (manual, after all tasks)

- Dev server, both themes: home, /browse, a sorter page, the duel screen, a rankings page, mobile menu sheet. Everything renders in the new faces; no grid anywhere; primary buttons flat.
- DevTools on the wordmark and a card title: computed `font-family` is League Gothic, `font-synthesis-weight: none`, rendered weight not synthetically bolded.
- Network tab: only `/_next/static/media/*.woff2` font requests — nothing from `fonts.googleapis.com`/`fonts.gstatic.com`.
- Generate both share-image variants from a rankings page: card renders in new faces, no grid, still looks intentional.
