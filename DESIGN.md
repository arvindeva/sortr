---
name: sortr
description: Everything's a versus.
colors:
  midnight: "#0b0918"
  deep-panel: "#13102a"
  popover-panel: "#15122c"
  text-primary: "#f3f0ff"
  text-muted: "#a39ec2"
  text-secondary: "#8c87a6"
  text-faint: "#6f6a86"
  magenta: "#ff2e7e"
  magenta-deep: "#e01e65"
  magenta-ink-light: "#d81b65"
  cyan: "#19e3df"
  teal-ink-light: "#0a9d9a"
  yellow: "#ffd23f"
  yellow-ink-light: "#b07d00"
  violet: "#9b6bff"
  coral: "#ff7a59"
  destructive: "#ff4d4d"
  medal-gold: "#ffd23f"
  medal-silver: "#cdd6e8"
  medal-bronze: "#d68a4e"
  light-canvas: "#f4f2fb"
  light-text-primary: "#17132e"
  light-text-muted: "#5a5478"
typography:
  display:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  control: "6px"
  field: "10px"
  tile: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.magenta}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  cover-tile:
    backgroundColor: "{colors.magenta}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
  name-plate:
    backgroundColor: "{colors.deep-panel}"
    textColor: "{colors.text-primary}"
  search-field:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
  chip:
    backgroundColor: "rgba(255,255,255,0.03)"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
---

# Design System: sortr

## Overview

**Creative North Star: "The Character Select Screen"**

sortr looks like the moment before a fight: a dark cabinet, a roster of big colored tiles with condensed names, and two sides squaring off under a pulsing VS. The interface is the arena; the fandom's characters, albums, and ships are the fighters. Every screen should feel like picking a side.

The world is dark, flat, and electric. A midnight indigo canvas carries five bright accents that do the shouting: magenta leads, cyan answers, and yellow, violet and coral fill out the roster. Display type is condensed, heavy, and uppercase, HUD labels read like a scoreboard, and body copy stays plain and quiet so the loud parts land. Components are punchy and tactile — buttons press, tiles lift — but buttons stay flat; glow is reserved for the signature VS and logo moments.

The same identity ships in a light theme: the canvas flips light, accent fills stay just as bright, glows become crisp colored shadows, and accent *text* deepens to stay legible on white.

**Key Characteristics:**
- Midnight canvas with five rotating accent fills; magenta is the one primary.
- Condensed, heavy, uppercase display type (Anybody at 75% width) against plain Mona Sans body.
- HUD/scoreboard labels: uppercase, widely tracked.
- Square cover tiles with the name bottom-left over a black scrim — the roster.
- The VS diamond and the two-squares logo as the brand's signature marks.
- Punchy, tactile, flat: press and lift feedback, no glow shadows on buttons.

## Colors

A dark, saturated roster palette: one midnight ground, one magenta lead, and four supporting accents that cycle through cover tiles.

### Primary
- **Arcade Magenta** (#ff2e7e): the primary action, the VS marker, the logo's filled square, focus rings, and the route loading bar. Buttons use a vertical gradient into **Deep Magenta** (#e01e65). On light, small magenta text deepens to **Magenta Ink** (#d81b65); large display magenta stays bright.

### Secondary
- **Arcade Cyan** (#19e3df): the answering side — links, the logo's outlined square, secondary highlights. As text on light it becomes **Teal Ink** (#0a9d9a); raw cyan on white is illegible.

### Tertiary
- **Coin Yellow** (#ffd23f): gold accents and the first-place medal. As text on light: **Yellow Ink** (#b07d00).
- **Roster Violet** (#9b6bff) and **Roster Coral** (#ff7a59): the 4th and 5th cover-tile colors; supporting only, never a primary role.

### Neutral
- **Midnight** (#0b0918): the canvas, flat on every page.
- **Deep Panel** (#13102a): name plates, label bars, deep panels; stays dark even in light mode as a label plate.
- **Popover Panel** (#15122c): menus and popovers.
- **Starlight** (#f3f0ff) primary text · **Lavender Muted** (#a39ec2) body muted · **Dusk** (#8c87a6) secondary · **Faint HUD** (#6f6a86) placeholders and faint labels.
- Light theme: canvas **Pale Lilac** (#f4f2fb), primary text **Ink Indigo** (#17132e), muted **Slate Violet** (#5a5478).

### Named Rules
**The Roster Rule.** Cover tiles cycle magenta → cyan → yellow → violet → coral via `accentFor()`, a stable color per entity. Accents are fills first; when an accent is used as text, use its `-ink` variant so it passes contrast in both themes.

**The Team Color Rule.** On the homepage each section owns one roster accent (Hot = yellow, This week = violet, Fresh = magenta, Popular = coral; the hero keeps its magenta typewriter word). Its heading sits in a tilted block of that accent (−1.5°, midnight text) and its tiles glow in that accent on hover. Use `teamColorStyle()` from `src/lib/team-colors.ts` with the `<TeamHeading>` component (each wrapped line gets its own block); never two adjacent sections in the same accent.

**The Fill vs Ink Rule.** Accent *fills* are identical in both themes. Accent *text* deepens in light mode (`text-main-ink`, `text-cyan-ink`, `text-yellow-ink`). Never put raw cyan or yellow text on a light surface.

## Typography

**Display Font:** Anybody (variable weight 100–900, width axis; system-ui fallback), rendered condensed at 75% width globally
**Body Font:** Mona Sans (variable 200–900; system-ui fallback)
**Label/Mono Font:** Mona Sans in the HUD treatment — there is no separate monospace

**Character:** a squared, condensed fighting-game display face that runs heavy and loud, paired with a plain, modern body face that gets out of the way.

### Hierarchy
- **Display** (800–900, clamp-sized, line-height 0.9, uppercase): hero lines, section titles, CTA labels in arcade buttons, cover-tile names. UI copy is uppercase; user-content titles (sorter names) keep their own casing.
- **Headline** (800, line-height 1, +0.01em tracking): page and card headings.
- **Body** (400, ~1.5 line-height): descriptions, explanatory copy, forms.
- **Label / HUD** (600–700, small, uppercase, 0.08–0.16em tracking): meta, counters, eyebrows, the "round 2/5" scoreboard read.

### Named Rules
**The Scoreboard Rule.** Meta information (counts, dates, round numbers, eyebrows) is HUD text — uppercase and widely tracked — never a second body style.

## Layout

Content sits in a centered container (nav and page shells up to ~1280px, padding ~22–32px on desktop, 16px on mobile). Pages are vertical stacks of sections separated by generous gaps (40–48px). Sorter and item collections are responsive grids of square tiles. The phone is the primary screen (~80% of traffic): layouts collapse to a single column, the nav reduces to two 42px buttons, and the main action stays reachable.

The nav is sticky and transparent at the top; once the page scrolls it frosts (~85% midnight with a backdrop blur) and a hairline border fades in.

## Elevation & Depth

Flat by default. Depth comes from tonal layering — surface cards at 3% white over the midnight canvas, deep panels at #13102a — and from hairline borders (8% white), not from shadows. Glow is a brand signal, not an elevation tool: the VS marker pulses a magenta halo and the logo dot glows; in light mode both become crisp colored shadows (e.g. `0 8px 22px rgba(255,46,126,.35)`). Light-mode cards get a soft lift shadow (`0 6px 16px rgba(22,16,52,.06)`).

### Named Rules
**The Glow Is a Signature Rule.** Glow belongs to the VS marker, the logo, and card hover accents. Buttons and containers never glow.

**The Clear Air Rule.** Nothing animated, transformed, or GPU-promoted sits behind the frosted nav. On Android Chrome, animated layers under a backdrop blur make it draw over its own contents (it hid the route loading bar until the homepage backdrop was removed, Oct 2026).

## Shapes

Squares lead. The logo is two 11px squares (2px radius), the VS marker is a square rotated 45°, and cover tiles are squares with gently rounded corners (12–14px). Controls use small radii (6–8px buttons, 10px fields); chips and pills are fully rounded. Borders are hairlines; emphasis comes from color, not thicker strokes.

## Components

### Buttons
Punchy and tactile, flat.
- **Shape:** small radius (6px).
- **Primary:** Arcade Magenta vertical gradient (#ff2e7e → #e01e65), white label; heights 36/40/44px.
- **Arcade variant:** display face, extra-bold, uppercase, 0.04em tracking — for hero and sorter CTAs.
- **Hover / Focus / Press:** hover brightens (~110%); focus shows a 2px magenta ring offset from the canvas; press scales to 98%.
- **Secondary:** transparent with a 20% foreground border, primary text; hover adds a faint 5% fill.
- **Ghost:** no border, faint fill on hover.

### Cards / Cover Tiles
The roster tile — the signature component.
- **Corner Style:** gently rounded (12–14px), always square (`aspect-square`).
- **Background:** uploaded cover art, or the entity's accent color with a subtle 45° stripe texture.
- **Content:** the title bottom-left in the display face over a black bottom scrim (`linear-gradient(180deg, transparent, rgba(0,0,0,.82))`), clamped to 3 lines. Nothing else on the tile.
- **Hover:** lifts 4–5px with an accent border and glow.

### Inputs / Fields
- **Style:** 5% white fill, 10% white border, small radius; HUD-style placeholder; the search field carries a `/` hint chip.
- **Focus:** magenta border/ring.

### Navigation
Sticky top bar with logo, search, Browse, Create (primary), and account actions. On mobile it shows only a ghost search button and a magenta menu toggle (☰↔✕); the menu sheet slides down (fade + translateY, ~220ms) over a dimmed page with large display-face rows. The route loading bar (magenta, 3px) renders inside the nav.

### Chips
- **Style:** HUD text on a faint surface with a hairline border, fully rounded.
- **State:** hover shifts border and text to the accent.

### VS Marker
A 56px square rotated 45° on the canvas color, 2px magenta border, "VS" in the display face, pulsing (`sortrPulse`). It marks every head-to-head moment.

## Do's and Don'ts

### Do:
- **Do** use Arcade Magenta (#ff2e7e) as the single primary action color per screen.
- **Do** cycle cover-tile colors with `accentFor()` so each entity keeps a stable color.
- **Do** use the `-ink` text variants for accent-colored text so it stays legible in light mode.
- **Do** set UI display copy in uppercase Anybody; keep user-content titles in their own casing.
- **Do** design for the phone first; most sorting happens there.
- **Do** honor `prefers-reduced-motion` for every loop and parallax.

### Don't:
- **Don't** use Inter, Arial, Roboto, Space Grotesk, Space Mono, or Big Shoulders, and don't drift into soft, rounded, generic SaaS cards.
- **Don't** put author, play counts, category chips, rank or NEW badges on cover tiles — title over scrim only.
- **Don't** give buttons or containers glow shadows; glow is reserved for the VS marker, logo, and tile hover.
- **Don't** place animated, transformed, or `will-change` layers behind the frosted nav.
- **Don't** put raw cyan or yellow text on a light surface.
