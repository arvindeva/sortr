import type { CSSProperties } from "react";

/**
 * "Team colors" for homepage sections: each section owns one roster accent.
 * Its heading sits in a tilted block of that color, and its cover tiles
 * glow in that color on hover via the
 * --card-accent / --card-accent-glow variables SorterCard reads.
 */
export const TEAM_COLORS = {
  yellow: "var(--yellow)",
  cyan: "var(--cyan)",
  violet: "var(--violet)",
  magenta: "var(--main)",
  coral: "var(--coral)",
} as const;

export type TeamColor = keyof typeof TEAM_COLORS;

export function teamColorStyle(color: TeamColor): CSSProperties {
  const c = TEAM_COLORS[color];
  return {
    "--team": c,
    "--card-accent": c,
    "--card-accent-glow": `color-mix(in srgb, ${c} 32%, transparent)`,
  } as CSSProperties;
}


/** h2 classes for an uncolored section heading (the default). */
export const SECTION_HEADING_CLASS =
  "display text-3xl font-black text-foreground md:text-[42px]";
