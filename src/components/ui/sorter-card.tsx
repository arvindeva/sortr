import Link from "next/link";
import { CoverTile } from "@/components/ui/cover-tile";
import { cn } from "@/lib/utils";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
  };
  className?: string;
}

/**
 * The canonical sorter card: a square cover (uploaded art, or a name tile
 * cycling the arcade accents) with the title pinned to the bottom over a black
 * scrim — the same treatment as the items in the shareable ranking image.
 * Lifts and gains an accent glow on hover. No meta row (author/plays) or badges.
 */
export function SorterCard({ sorter, className }: SorterCardProps) {
  return (
    <Link
      href={`/sorter/${sorter.slug}`}
      className={cn("group block h-full w-full", className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-main/50 group-hover:shadow-[0_0_32px_rgba(255,46,126,.28)]">
        {/* Cover fills the whole square. When there's no artwork, CoverTile
            paints the accent color tile with its centered name suppressed
            (hideName); we draw our own bottom-aligned title over the scrim so
            image and image-less cards share one layout. */}
        <CoverTile
          imageUrl={sorter.coverImageUrl}
          name={sorter.title}
          colorKey={sorter.slug}
          hideName
          radius={0}
          className="absolute inset-0 h-full w-full"
        />

        {/* Bottom scrim keeps the title legible over any image. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[55%]"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(0,0,0,.82))",
          }}
        />

        {/* Title — pinned bottom-left, clamped to 2 lines. Padding lives on
            the wrapper: line-clamp only hides overflow past the CONTENT box,
            so padding on the clamped element lets a clipped 3rd line paint
            into it (the "sliver below the 2nd line" bug). */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <h3
            className="display normal-case line-clamp-2 text-[19px] font-extrabold leading-[1.05] text-white"
            title={sorter.title}
          >
            {sorter.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
