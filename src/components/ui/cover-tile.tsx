import { cn } from "@/lib/utils";
import { accentFor } from "@/lib/utils";

interface CoverTileProps {
  /** Uploaded artwork URL. When present, it's shown instead of the name tile. */
  imageUrl?: string | null;
  /** The name shown on the color tile when there's no artwork. */
  name: string;
  /**
   * Stable key for picking the tile color (slug/id/title). Same key → same
   * accent. Or pass a number to index the cycle directly.
   */
  colorKey?: string | number;
  /** Font size of the name on the tile, in px. Tune per usage. */
  nameSize?: number;
  /** Rounded corners. Defaults to 12px (the card radius). */
  radius?: number;
  className?: string;
}

/**
 * A sorter/item cover: shows uploaded artwork if present, otherwise a colored
 * tile (cycling the arcade accents) with the NAME in the condensed display
 * face — the canonical cover-less fallback in the VERSUS arcade system. A faint
 * 45° stripe overlay gives the flat color some texture.
 */
export function CoverTile({
  imageUrl,
  name,
  colorKey,
  nameSize = 21,
  radius = 12,
  className,
}: CoverTileProps) {
  if (imageUrl) {
    return (
      <div
        className={cn("bg-cover bg-center", className)}
        style={{
          backgroundImage: `url(${imageUrl})`,
          borderRadius: radius,
        }}
        role="img"
        aria-label={name}
      />
    );
  }

  const color = accentFor(colorKey ?? name);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden text-center",
        className,
      )}
      style={{ background: color, borderRadius: radius }}
    >
      {/* 45° stripe texture */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,0,0,.06) 0 14px, transparent 14px 28px)",
        }}
      />
      <span
        className="display relative px-3 font-extrabold"
        style={{
          fontSize: nameSize,
          color: "rgba(0,0,0,.74)",
          lineHeight: 0.95,
        }}
      >
        {name}
      </span>
    </div>
  );
}
