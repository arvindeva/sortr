import { getHotSorters, getTrendingSorters } from "@/lib/trending-sorters";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { SorterCard } from "@/components/ui/sorter-card";
import {
  SECTION_HEADING_CLASS,
  teamColorStyle,
  type TeamColor,
} from "@/lib/team-colors";
import { TeamHeading } from "@/components/ui/team-heading";

interface TrendingSortersSectionProps {
  /** Omit the current sorter (when shown on its own sorter/ranking page). */
  excludeSorterId?: string;
  /** How many to show. */
  limit?: number;
  /** Heading text. Defaults per window. */
  title?: string;
  /** Play-count window: "week" (7 days, default) or "day" (24h, "Hot sorters"). */
  window?: "week" | "day";
  /** Homepage "team color" for the heading block and tile hover glow. */
  color?: TeamColor;
  className?: string;
}

/**
 * "Trending this week" — sorters with the most plays in the last 7 days. Placed
 * at the bottom of sorter/ranking pages (where viral traffic lands) to pull a
 * one-sorter visit into broader discovery, and on the homepage.
 *
 * Server component — renders nothing if there's no trending data.
 */
export async function TrendingSortersSection({
  excludeSorterId,
  limit = 10,
  window = "week",
  title = window === "day" ? "Hot sorters" : "Trending this week",
  color,
  className,
}: TrendingSortersSectionProps) {
  const trending =
    window === "day"
      ? await getHotSorters(limit, excludeSorterId)
      : await getTrendingSorters(limit, excludeSorterId);

  if (trending.length === 0) return null;

  return (
    <section
      className={className}
      style={color ? teamColorStyle(color) : undefined}
    >
      <div className="mb-6 flex items-end justify-between gap-3">
        {color ? (
          <TeamHeading>{title}</TeamHeading>
        ) : (
          <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
        )}
      </div>
      <SorterGrid>
        {trending.map((sorter) => (
          <SorterCard key={sorter.id} sorter={sorter} />
        ))}
      </SorterGrid>
    </section>
  );
}
