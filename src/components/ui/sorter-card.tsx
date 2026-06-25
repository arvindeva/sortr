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
  className?: string;
}

/**
 * The canonical sorter card: a colored cover tile (uploaded art, or a name
 * tile cycling the arcade accents) above a display-font title and a mono meta
 * row (@author · plays). Lifts and gains an accent glow on hover.
 */
export function SorterCard({ sorter, badge, className }: SorterCardProps) {
  const plays = sorter.completionCount.toLocaleString();

  return (
    <Link
      href={`/sorter/${sorter.slug}`}
      className={cn("group block w-full", className)}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-main/50 group-hover:shadow-[0_0_32px_rgba(255,46,126,.28)]">
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
        </div>

        {/* Meta */}
        <div className="px-3 py-3">
          <h3 className="display line-clamp-2 text-[18px] font-extrabold text-foreground">
            {sorter.title}
          </h3>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="truncate text-muted-foreground">
              @{sorter.creatorUsername}
            </span>
            {sorter.completionCount > 0 && (
              <span className="shrink-0 pl-2 text-cyan">{plays} ▸</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
