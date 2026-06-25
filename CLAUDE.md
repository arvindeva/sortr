# sortr — design system ("VERSUS arcade")

A playful, fandom-native ranking app. Vibe: retro arcade / VS-screen energy, dark and electric. Every page must use this system so the product feels consistent.

> Implementation notes (how these tokens/components are wired in this repo) live in `docs/design-system.md`. This file is the canonical brand spec.

## Color (dark base)
- Background: `#0b0918` (midnight indigo-black)
- Atmosphere (on bg): radial magenta glow top-right `rgba(255,46,126,.18)` + cyan glow left `rgba(25,227,223,.11)`; faint 48px grid `rgba(255,255,255,.03)`
- Surface card: `rgba(255,255,255,.03)`, border `rgba(255,255,255,.08)`
- Elevated panel (duel machine): `linear-gradient(180deg, rgba(22,18,46,.9), rgba(12,10,28,.95))`, border `rgba(255,46,126,.4)`, glow `0 0 60px rgba(255,46,126,.18)`
- Deep panel / name bars: `#13102a`
- Text primary `#f3f0ff` · muted `#a39ec2` · secondary `#8c87a6` · faint/HUD `#6f6a86`

### Accents
- Magenta (PRIMARY): `#ff2e7e`, button gradient `linear-gradient(180deg,#ff2e7e,#e01e65)`, glow `rgba(255,46,126,.35–.4)`
- Cyan (SECONDARY): `#19e3df`
- Yellow: `#ffd23f`
- Violet: `#9b6bff`
- Extended cover color (5th+ items): coral `#ff7a59`
Item/sorter cover tiles cycle through these accents; cover text is `rgba(0,0,0,.72)`.

## Type (Google Fonts)
- Display / headings / wordmark: **Big Shoulders Display** 800–900, `text-transform:uppercase`, tight line-height (.88–1)
- HUD / labels / meta / numbers / placeholders: **Space Mono** 400/700, uppercase, `letter-spacing:.08–.16em`
- Body / UI: **Space Grotesk** 400–700
Never use generic Inter/Arial/Roboto.

## Components
- **Logo:** two 11px **squares** (`border-radius:2px`) — one filled magenta with `sortrGlow` pulse, one cyan outline — + wordmark `SORTR` (Big Shoulders 900, ~30px). Squares evoke the two VS panels. Links to home.
- **VS marker:** 56px square rotated 45°, bg `#0b0918`, 2px magenta border, "VS" in Big Shoulders magenta, `sortrPulse` animation.
- **Nav:** top bar, `max-width:1280` centered, padding `22px 32px`, border-bottom `rgba(255,255,255,.08)`. Items: search field, Browse, Create (primary), then Profile/Logout (logged-in) or Log in (anon).
  - **Mobile nav:** transparent at the top; on scroll it frosts (`background:rgba(11,9,24,.85)` + `backdrop-filter:blur(8px)`, border-bottom fades in). Bar shows only two 42px buttons — a ghost search (border `rgba(255,255,255,.16)`, radius 10) and a magenta-gradient menu toggle that swaps ☰↔✕. The menu sheet opens below the bar (fade + translateY −10→0, ~.22s) over a dimmed page; panel `linear-gradient(180deg,#120f24,#0b0918)` + the 48px grid; contents top→bottom: a search field, a vertical nav list (Browse / Profile / Log out as Big Shoulders 26px uppercase rows with a ▸ and a bottom hairline, Log out muted; logged-out shows Log in instead), one magenta "+ Create a sorter" pill, and the theme toggle pinned at the bottom.
- **Search field:** `rgba(255,255,255,.05)`, border `rgba(255,255,255,.1)`, radius 6, mono placeholder, `/` hint chip.
- **Primary button:** magenta gradient, white, Big Shoulders 800 uppercase (or Space Grotesk 700 for small), radius 6–8, magenta shadow.
- **Secondary button:** border `rgba(255,255,255,.18)`, text primary.
- **Card:** radius 12–14, surface bg, border `rgba(255,255,255,.08)`; colored cover tile (accent bg, subtle 45° stripe overlay optional) with the item NAME in Big Shoulders (this IS the cover-less fallback — show full name, never a single letter); mono footer meta (`@author`, plays). **Title below the cover is clamped to 2 lines** (`display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden`) with a **reserved 2-line `min-height`** (~40px at 18px / ~44px at 20px) so every card is the same height and a long title never pushes the next row down. Pin the footer meta to the card bottom (`margin-top:auto`) as a backstop.
- **Progress:** thin pips (filled = accent, empty `rgba(255,255,255,.12)`) or a continuous track with magenta-gradient fill.
- **Chips/pills:** mono 13px, surface bg, border, hover → accent border+text.

## Motion
Keyframes: `sortrPulse` (VS), `sortrGlow` (logo dot), `sortrBlink` (cursor), `sortrMarquee` (ticker). Card hover: `translateY(-4/-5px)` + accent glow + accent border.

## Voice
Product-first, not marketing. State what it does plainly; lean into game/VS language ("pick a side", "round 2/5", "ranking locked"). Tagline: **"Everything's a versus."** Honest about auth: free to play anonymously; account only to create & save.

## Light mode
Same VERSUS-arcade identity, on light. Rule of thumb: keep accent **fills** bright, swap the canvas dark→light, and turn every **glow into a crisp colored shadow**. Deepen accents used as **text** so they pass contrast on white.

Token map (dark → light):
- bg `#0b0918` → `#f4f2fb`
- atmosphere glows: cut opacity ~⅔ (magenta `.18`→`.07`, cyan `.11`→`.06`)
- grid lines `rgba(255,255,255,.03)` → `rgba(22,16,52,.045)`
- surface card `rgba(255,255,255,.03)` → `#ffffff` + border `rgba(22,16,52,.1)` + soft shadow `0 6px 16px rgba(22,16,52,.06)`
- any `rgba(255,255,255,α)` border/fill → `rgba(22,16,52, α+.02)`
- elevated panel gradient → `#ffffff`; its glow `0 0 60px rgba(255,46,126,.18)` → shadow `0 16px 44px rgba(255,46,126,.16)`
- deep name bars `#13102a` → keep dark `#17132e` (label plate) with `#fff` text
- text: primary `#f3f0ff`→`#17132e` · muted `#a39ec2`→`#5a5478` · secondary `#8c87a6`→`#6e688a` · faint `#6f6a86`→`#938da8`
- **accent-as-text legibility:** magenta `#ff2e7e` only for large display — links/small labels use `#d81b65`; cyan `#19e3df` is illegible on white as text → use teal `#0a9d9a`; yellow label `#ffd23f` → `#b07d00`
- **accent fills unchanged:** cover tiles, magenta button gradient, bright pip fills, NEW badge — all stay vibrant (they pop on light)
- VS marker: bg `#fff`, magenta border + magenta "VS"; pulse = soft shadow `0 8px 22px rgba(255,46,126,.35)` (no blur ring)
- medals (gold/silver/bronze) unchanged

## Implementation pointers (this repo)
- Tokens + `:root`/`:root.dark` blocks + keyframes: `src/app/globals.css`. Accents come in fill (`--main`/`--cyan`/`--yellow`) and ink (`--main-ink`/`--cyan-ink`/`--yellow-ink`) variants — use `bg-*`/`border-*` for fills and `text-*-ink` for accent text.
- Fonts: `src/app/layout.tsx`, wired through the `--font-*` namespace.
- Shared primitives: `SortrLogo`/`Wordmark`/`VsMarker` (`ui/sortr-mark.tsx`), `CoverTile` (`ui/cover-tile.tsx`), `ArcadePageHeader` (`ui/arcade-page-header.tsx`), `ArcadeBackground` (`ui/arcade-background.tsx`), `accentFor()` (`lib/utils.ts`).
- Dark is the default theme; light is opt-in via the toggle.
