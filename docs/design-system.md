# sortr design system — "VERSUS arcade"

A playful, fandom-native ranking app. Vibe: retro arcade / fighting-game
VS-screen energy, dark and electric. Dark is the designed truth and the default
theme; light is a derived variant (see **Light mode** below).

This doc describes the system **as implemented in this repo** (token names,
utility classes, components) — not the original HTML prototype. Source of the
visual spec: the handoff prototypes under `~/Sortr Redesign/design_handoff_sortr/`.

## Theming model

- Tokens live in `src/app/globals.css`. `:root` = light values, `:root.dark` =
  dark values. **The dark block uses `:root.dark` (specificity 0-2-0), not bare
  `.dark`** — Tailwind v4 emits it before the `:root` block, so a plain `.dark`
  would lose on source order and the page would render light even with the class
  applied. Keep the `:root.dark` selector.
- `next-themes` is configured `attribute="class"`, `defaultTheme="dark"`,
  `enableSystem={false}` (in `src/components/providers.tsx`). Dark is the
  unconditional default; light is opt-in via the toggle.
- Brand accents are mapped onto the existing shadcn token names
  (`--main`, `--secondary`, etc.) so every component inherits the look. Existing
  `dark:` Tailwind utilities keep working because the `.dark` class is still
  present on `<html>` in dark mode.

## Color (dark — the fidelity target)

| Token | Value | Use |
|---|---|---|
| `--background` | `#0b0918` | page background (midnight indigo-black) |
| `--secondary-background` | `#13102a` | deep panel / name bars |
| `--foreground` | `#f3f0ff` | primary text |
| `--muted-foreground` | `#a39ec2` | body muted |
| `--border` | `rgba(255,255,255,.08)` | card & divider borders |
| `--main` | `#ff2e7e` | magenta — PRIMARY |
| `--main-gradient` | `linear-gradient(180deg,#ff2e7e,#e01e65)` | primary buttons |
| `--cyan` | `#19e3df` | SECONDARY — links, accents |
| `--yellow` | `#ffd23f` | gold / accent |
| `--violet` | `#9b6bff` | accent |
| `--coral` | `#ff7a59` | extended cover accent (5th item) |
| `--panel` | gradient | elevated "machine" panel (duel / community ranking) |
| `--panel-border` | `rgba(255,46,126,.4)` | + `--panel-glow` `0 0 60px rgba(255,46,126,.18)` |
| `--medal-gold/silver/bronze` | `#ffd23f` / `#cdd6e8` / `#d68a4e` | rank 1/2/3 |

Accents are exposed as utilities: `bg-cyan`, `text-yellow`, `border-violet`,
`text-main`, etc.

**Atmosphere** (painted behind every page via `<ArcadeBackground />` in the
layout, using the `.arcade-atmosphere` pseudo-element layers): radial magenta
glow top-right + cyan glow left + a faint 48px grid.

**Cover tiles** cycle magenta → cyan → yellow → violet → coral. Use `accentFor(key)`
from `src/lib/utils.ts` for a stable per-entity color, or the `<CoverTile>`
component (shows uploaded art if present, else a colored name tile). Cover text
is `rgba(0,0,0,.74)`.

## Type

- **Display / headings / wordmark / numbers:** Big Shoulders (`font-heading`),
  weights 600–900, uppercase, tight leading. Use the `.display` utility for the
  full loud treatment (font + uppercase + tight line-height).
- **HUD / labels / meta / counters:** Space Mono (`font-mono`). Use the `.hud`
  utility for uppercase + wide tracking.
- **Body / UI:** Space Grotesk (`font-base`, the body default).
- Fonts are wired via the `--font-*` namespace in `@theme inline`
  (`--font-heading`, `--font-base`, `--font-mono`). **Do not** rename these to
  `--font-family-*` — Tailwind v4 generates the `font-*` utilities from the
  `--font-*` namespace and the family- prefix silently no-ops.

## Components (in `src/components/ui/`)

- **Logo:** `<SortrLogo>` = `<SortrMark>` (two squares: magenta filled + glow,
  cyan outline) + `<Wordmark>` ("SORTR", display 900). `<Wordmark withPeriod>`
  for the footer lockup.
- **VS marker:** `<VsMarker>` — square rotated 45°, 2px magenta border, "VS"
  upright in the display face, `sortr-pulse`. `glyph="★"` for the results hand-off.
- **Cover tile:** `<CoverTile imageUrl name colorKey>` — art-or-name-tile.
- **Button:** magenta-gradient primary; `variant="neutral"` outlined secondary;
  add the `arcade` prop for the loud display-uppercase label (big CTAs only).
- **Sorter card:** `<SorterCard sorter badge>` — cover tile + display title +
  mono meta row (@author · plays). `badge={{label,tone}}` for #rank / NEW chips.

## Motion (utility classes, all respect `prefers-reduced-motion`)

- `.sortr-pulse` — VS marker (scale + magenta halo; element holds the 45° rotation).
- `.sortr-glow` — logo dot opacity pulse.
- `.sortr-blink` — blinking cursor `▮`.
- `.sortr-marquee` — activity ticker (translateX 0 → -50%; pauses on hover).

## Voice

Product-first, not marketing. Plain about what it does; lean into game/VS
language ("pick a side", "round 2/5", "ranking locked"). Tagline:
**"Everything's a versus."** Honest about auth: free to play anonymously, account
only to create & save.

## Light mode

Same VERSUS-arcade identity on light (spec from the design lead). Three rules:
**keep accent fills bright** (covers, button gradient, pips, badges pop on white),
**turn every glow into a crisp colored shadow** (no blur rings), and **deepen
accents used as text** so they pass contrast.

This is why accents come in two token families:

- **Fills** — `--main`, `--cyan`, `--yellow` (utilities `bg-*`, `border-*`).
  Bright in both themes.
- **Ink** (text/links) — `--main-ink`, `--cyan-ink`, `--yellow-ink` (utilities
  `text-main-ink`, `text-cyan-ink`, `text-yellow-ink`). Identical to the fill on
  dark; deepened on light: magenta `#ff2e7e`→`#d81b65`, cyan `#19e3df`→teal
  `#0a9d9a` (raw cyan is illegible on white), yellow `#ffd23f`→`#b07d00`.

**When to use which:** large display magenta (the hero "versus.", section
arrows) stays the bright `text-main`; small magenta/cyan/yellow text and links
use the `-ink` utilities. If you add accent-colored *text* anywhere, use ink.

Key light values: bg `#f4f2fb`; surfaces `#fff` + border `rgba(22,16,52,.1)` +
soft shadow `0 6px 16px rgba(22,16,52,.06)`; panel white + magenta shadow (no
glow); atmosphere glows at ~⅓ strength; grid `rgba(22,16,52,.045)`; text primary
`#17132e` / muted `#5a5478`. The VS-marker pulse and panel glow swap to soft
drop shadows via the `--vs-pulse-*` and `--panel-glow` tokens. Medals unchanged.
Reference builds: `~/Sortr Redesign - Light Mode/sortr_update/Sortr *Light.dc.html`.
