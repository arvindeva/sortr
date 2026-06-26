import { getTrendingSorters } from "@/lib/trending-sorters";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { SorterCard } from "@/components/ui/sorter-card";

interface TrendingSortersSectionProps {
  /** Omit the current sorter (when shown on its own sorter/ranking page). */
  excludeSorterId?: string;
  /** How many to show. */
  limit?: number;
  /** Heading text. */
  title?: string;
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
  title = "Trending this week",
  className,
}: TrendingSortersSectionProps) {
  const trending = await getTrendingSorters(limit, excludeSorterId);

  if (trending.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-6 flex items-end justify-between gap-3">
        <h2 className="display text-3xl font-black text-foreground md:text-[42px]">
          {title}
        </h2>
      </div>
      <SorterGrid>
        {trending.map((sorter, i) => (
          <SorterCard
            key={sorter.id}
            sorter={sorter}
            badge={i < 3 ? { label: `#${i + 1}`, tone: "rank" } : undefined}
          />
        ))}
      </SorterGrid>
    </section>
  );
}
