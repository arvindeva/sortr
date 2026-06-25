import { cn } from "@/lib/utils";

interface SortrMarkProps {
  /** Pixel size of each square. Defaults to 12 (the brand spec size). */
  size?: number;
  className?: string;
}

/**
 * The sortr brand mark: two small squares — one filled magenta with a soft
 * glow pulse, one cyan outline — evoking the two VS panels of a versus screen.
 * Square corners are barely rounded (2px) per the VERSUS arcade spec.
 */
export function SortrMark({ size = 12, className }: SortrMarkProps) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex items-center", className)}
      style={{ gap: 5 }}
    >
      {/* Filled, glowing */}
      <span
        className="sortr-glow block bg-main"
        style={{ width: size, height: size, borderRadius: 2 }}
      />
      {/* Cyan outline */}
      <span
        className="block border-2 border-cyan"
        style={{
          width: size,
          height: size,
          borderRadius: 2,
          boxSizing: "border-box",
        }}
      />
    </span>
  );
}

interface WordmarkProps {
  /** Font size of the SORTR wordmark in px. Defaults to 30. */
  size?: number;
  /** Append a magenta period (the footer lockup uses this). */
  withPeriod?: boolean;
  className?: string;
}

/** The "SORTR" wordmark in the display face, optionally with a magenta dot. */
export function Wordmark({
  size = 30,
  withPeriod = false,
  className,
}: WordmarkProps) {
  return (
    <span
      className={cn("font-heading font-black text-foreground", className)}
      style={{ fontSize: size, letterSpacing: "0.02em", lineHeight: 1 }}
    >
      SORTR
      {withPeriod && <span className="text-main">.</span>}
    </span>
  );
}

/** The full logo lockup: mark + wordmark. Used in the navbar. */
export function SortrLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <SortrMark />
      <Wordmark />
    </span>
  );
}

interface VsMarkerProps {
  /** Pixel size of the (pre-rotation) square. Defaults to 56. */
  size?: number;
  /** Glyph in the center — "VS" by default, or "★" on the results hand-off. */
  glyph?: string;
  /** Color of the glyph. Defaults to magenta; results screen uses gold. */
  glyphColor?: string;
  /** Whether the marker pulses/glows. Off where it'd distract (e.g. the duel). */
  pulse?: boolean;
  className?: string;
}

/**
 * The VS marker: a square rotated 45°, magenta-bordered, with "VS" upright in
 * the display face. The signature device that sits between two contenders. The
 * glyph counter-rotates so it stays upright. Pulses by default; pass
 * `pulse={false}` to keep it static (the 45° rotation is preserved either way).
 */
export function VsMarker({
  size = 56,
  glyph = "VS",
  glyphColor = "var(--main)",
  pulse = true,
  className,
}: VsMarkerProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-2 border-main",
        pulse && "sortr-pulse",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: "var(--background)",
        // When not pulsing, apply the 45° rotation here (the .sortr-pulse class
        // normally carries it). Keeps the marker a diamond either way.
        ...(pulse ? {} : { transform: "rotate(45deg)" }),
      }}
    >
      <span
        className="font-heading font-black"
        style={{
          transform: "rotate(-45deg)",
          fontSize: Math.round(size * 0.39),
          color: glyphColor,
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
    </span>
  );
}
