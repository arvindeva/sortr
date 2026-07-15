# sortr — design system ("VERSUS arcade")

A playful, fandom-native ranking app. Vibe: retro arcade / VS-screen energy, dark and electric. Every page must use this system so the product feels consistent.

> Implementation notes (how these tokens/components are wired in this repo) live in `docs/design-system.md`. This file is the canonical brand spec.

## Color (dark base)
- Background: `#0b0918` (midnight indigo-black) — flat, no atmosphere layer
- Surface card: `rgba(255,255,255,.03)`, border `rgba(255,255,255,.08)`
- Deep panel / name bars: `#13102a`
- Text primary `#f3f0ff` · muted `#a39ec2` · secondary `#8c87a6` · faint/HUD `#6f6a86`

### Accents
- Magenta (PRIMARY): `#ff2e7e`, button gradient `linear-gradient(180deg,#ff2e7e,#e01e65)`, glow `rgba(255,46,126,.35–.4)`
- Cyan (SECONDARY): `#19e3df`
- Yellow: `#ffd23f`
- Violet: `#9b6bff`
- Extended cover color (5th+ items): coral `#ff7a59`
Item/sorter cover tiles cycle through these accents; cover text is `rgba(0,0,0,.72)`.

## Type (self-hosted woff2 via next/font/local — files in src/app/fonts/)
- Display / headings / wordmark: **Anybody** (variable: weight 100–900, width 50–150%), squared-geometric, rendered condensed via `font-stretch: 75%` set globally on `html`. Display text runs heavy (800–900 — real weights). UI display copy is uppercase; user-content titles keep their own casing.
- HUD / labels / meta / numbers / placeholders: **Mona Sans** (the body face — no separate monospace), uppercase, `letter-spacing:.08–.16em` via the `.hud` utility
- Body / UI: **Mona Sans** (variable 200–900)
Never use generic Inter/Arial/Roboto — and never the former AI-default trio (Big Shoulders, Space Mono, Space Grotesk).

## Components
- **Logo:** two 11px **squares** (`border-radius:2px`) — one filled magenta with `sortrGlow` pulse, one cyan outline — + wordmark `SORTR` (Anybody, ~30px). Squares evoke the two VS panels. Links to home.
- **VS marker:** 56px square rotated 45°, bg `#0b0918`, 2px magenta border, "VS" in Anybody magenta, `sortrPulse` animation.
- **Nav:** top bar, `max-width:1280` centered, padding `22px 32px`, border-bottom `rgba(255,255,255,.08)`. Items: search field, Browse, Create (primary), then Profile/Sign out (logged-in) or Sign in (anon).
  - **Mobile nav:** transparent at the top; on scroll it frosts (`background:rgba(11,9,24,.85)` + `backdrop-filter:blur(8px)`, border-bottom fades in). Bar shows only two 42px buttons — a ghost search (border `rgba(255,255,255,.16)`, radius 10) and a magenta-gradient menu toggle that swaps ☰↔✕. The menu sheet opens below the bar (fade + translateY −10→0, ~.22s) over a dimmed page; panel `linear-gradient(180deg,#120f24,#0b0918)`; contents top→bottom: a search field, a vertical nav list (Browse / Profile / Sign out as Anybody 26px uppercase rows with a ▸ and a bottom hairline, Sign out muted; logged-out shows Sign in instead), one magenta "+ Create a sorter" pill, and the theme toggle pinned at the bottom.
- **Search field:** `rgba(255,255,255,.05)`, border `rgba(255,255,255,.1)`, radius 6, mono placeholder, `/` hint chip.
- **Primary button:** magenta gradient, white, Anybody uppercase (or Mona Sans 700 for small), radius 6–8, flat (no glow shadow).
- **Secondary button:** border `rgba(255,255,255,.18)`, text primary.
- **Card:** a **square** tile (radius 12–14, `aspect-square`, border `rgba(255,255,255,.08)`). The cover — uploaded art, or the accent color fallback (subtle 45° stripe texture) — fills the whole square. The item TITLE sits **bottom-left in Anybody over a black bottom scrim** (`linear-gradient(180deg, transparent, rgba(0,0,0,.82))`) so it's legible over any image; clamped to 2 lines. No footer meta (author/plays), no rank/NEW badge, no category chip — this mirrors the item squares in the shareable ranking image. (The cover-less fallback shows the title on the accent tile the same way, never a single letter.)
- **Progress:** thin pips (filled = accent, empty `rgba(255,255,255,.12)`) or a continuous track with magenta-gradient fill.
- **Chips/pills:** mono 13px, surface bg, border, hover → accent border+text.

## Motion
Keyframes: `sortrPulse` (VS), `sortrGlow` (logo dot), `sortrBlink` (cursor). Card hover: `translateY(-4/-5px)` + accent glow + accent border.

## Voice
Product-first, not marketing. State what it does plainly; lean into game/VS language ("pick a side", "round 2/5", "ranking locked"). Tagline: **"Everything's a versus."** Honest about auth: free to play anonymously; account only to create & save.

## Light mode
Same VERSUS-arcade identity, on light. Rule of thumb: keep accent **fills** bright, swap the canvas dark→light, and turn every **glow into a crisp colored shadow**. Deepen accents used as **text** so they pass contrast on white.

Token map (dark → light):
- bg `#0b0918` → `#f4f2fb`
- surface card `rgba(255,255,255,.03)` → `#ffffff` + border `rgba(22,16,52,.1)` + soft shadow `0 6px 16px rgba(22,16,52,.06)`
- any `rgba(255,255,255,α)` border/fill → `rgba(22,16,52, α+.02)`
- deep name bars `#13102a` → keep dark `#17132e` (label plate) with `#fff` text
- text: primary `#f3f0ff`→`#17132e` · muted `#a39ec2`→`#5a5478` · secondary `#8c87a6`→`#6e688a` · faint `#6f6a86`→`#938da8`
- **accent-as-text legibility:** magenta `#ff2e7e` only for large display — links/small labels use `#d81b65`; cyan `#19e3df` is illegible on white as text → use teal `#0a9d9a`; yellow label `#ffd23f` → `#b07d00`
- **accent fills unchanged:** cover tiles, magenta button gradient, bright pip fills, NEW badge — all stay vibrant (they pop on light)
- VS marker: bg `#fff`, magenta border + magenta "VS"; pulse = soft shadow `0 8px 22px rgba(255,46,126,.35)` (no blur ring)
- medals (gold/silver/bronze) unchanged

## Implementation pointers (this repo)
- Tokens + `:root`/`:root.dark` blocks + keyframes: `src/app/globals.css`. Accents come in fill (`--main`/`--cyan`/`--yellow`) and ink (`--main-ink`/`--cyan-ink`/`--yellow-ink`) variants — use `bg-*`/`border-*` for fills and `text-*-ink` for accent text.
- Fonts: self-hosted woff2 in `src/app/fonts/` (see its LICENSES.md), loaded in `src/app/layout.tsx` via `next/font/local`, wired through the `--font-*` namespace.
- Shared primitives: `SortrLogo`/`Wordmark`/`VsMarker` (`ui/sortr-mark.tsx`), `CoverTile` (`ui/cover-tile.tsx`), `ArcadePageHeader` (`ui/arcade-page-header.tsx`), `accentFor()` (`lib/utils.ts`). (The page background is flat — no atmosphere component.)
- Dark is the default theme; light is opt-in via the toggle.
