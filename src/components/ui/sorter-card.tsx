import Link from "next/link";
import { CoverTile } from "@/components/ui/cover-tile";
import { cn } from "@/lib/utils";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    creatorUsername: string;
    completionCount: number;
    category?: string;
    coverImageUrl?: string;
  };
  /** Optional corner badge, e.g. "#1" (popular) or "NEW" (fresh). */
  badge?: { label: string; tone?: "rank" | "new" };
  /** Show the sorter's category as a chip in the cover's bottom-right (browse). */
  showCategory?: boolean;
  className?: string;
}

/**
 * The canonical sorter card: a colored cover tile (uploaded art, or a name
 * tile cycling the arcade accents) above a display-font title and a mono meta
 * row (@author · plays). Lifts and gains an accent glow on hover.
 */
export function SorterCard({
  sorter,
  badge,
  showCategory,
  className,
}: SorterCardProps) {
  const plays = sorter.completionCount.toLocaleString();

  return (
    <Link
      href={`/sorter/${sorter.slug}`}
      className={cn("group block h-full w-full", className)}
    >
      {/* Full-height flex column so every card in a grid row matches height. */}
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-main/50 group-hover:shadow-[0_0_32px_rgba(255,46,126,.28)]">
        {/* Cover */}
        <div className="relative">
          <CoverTile
            imageUrl={sorter.coverImageUrl}
            name={sorter.title}
            colorKey={sorter.slug}
            nameSize={21}
            radius={0}
            className="h-40 w-full"
          />
          {badge && (
            <span
              className={cn(
                "absolute top-2 left-2 rounded font-mono text-[11px] font-bold",
                badge.tone === "new"
                  ? "bg-cyan/85 px-[7px] py-[3px] text-[#06212a]"
                  : "bg-black/55 px-[7px] py-[3px] text-white",
              )}
            >
              {badge.label}
            </span>
          )}
          {showCategory && sorter.category && (
            <span className="absolute right-2 bottom-2 rounded bg-black/40 px-[7px] py-[3px] font-mono text-[10px] tracking-wide text-white">
              {sorter.category}
            </span>
          )}
        </div>

        {/* Meta — fills remaining height; the author/plays row pins to bottom. */}
        <div className="flex flex-1 flex-col px-3 py-3">
          {/* Title: clamped to 2 lines, with 2 lines of space always reserved
              (18px @ line-height 1.1 → 40px) so 1-line titles don't shrink the
              card. title attr shows the full name on hover when truncated. */}
          <h3
            className="display line-clamp-2 min-h-[40px] text-[18px] font-extrabold leading-[1.1] text-foreground"
            title={sorter.title}
          >
            {sorter.title}
          </h3>
          <div className="mt-auto flex items-center justify-between pt-2 font-mono text-xs">
            <span className="truncate text-muted-foreground">
              @{sorter.creatorUsername}
            </span>
            {sorter.completionCount > 0 && (
              <span className="shrink-0 pl-2 text-cyan-ink">{plays} ▸</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
