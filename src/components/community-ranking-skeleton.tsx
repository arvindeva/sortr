import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for CommunityRanking while it loads client-side. Mirrors the real
 * component's structure (heading, meta line, ranked rows) so the space is
 * reserved and content fills in without a jarring layout shift.
 */
export function CommunityRankingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section>
      {/* Real heading (instant) so the user knows what's loading; only the meta
          line and rows are skeletons. Matches CommunityRanking's heading. */}
      <h2 className="display text-[30px] font-black text-foreground">
        Community ranking
      </h2>
      <div className="mt-1.5 mb-5">
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Rows: rank numeral + cover tile + title bar */}
      <ol className="flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3.5 rounded-[11px] border border-border bg-card px-3.5 py-2.5"
          >
            <Skeleton className="h-6 w-7 shrink-0" />
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-[7px]" />
            <Skeleton className="h-4 flex-1" />
          </li>
        ))}
      </ol>
    </section>
  );
}
