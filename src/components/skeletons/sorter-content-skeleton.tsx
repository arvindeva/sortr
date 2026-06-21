function RankingItemSkeleton() {
  return (
    <div className="border-border rounded-base bg-card flex items-center gap-3 border p-3 shadow-sm">
      <div className="bg-muted h-16 w-16 flex-shrink-0 rounded-base animate-pulse" />
      <div className="h-4 w-2/3 rounded-base bg-muted animate-pulse" />
    </div>
  );
}

function RecentRankingCardSkeleton() {
  return (
    <div className="border-border rounded-base bg-card border p-4 shadow-sm">
      <div className="mb-3 h-5 w-32 rounded-base bg-muted animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="bg-muted h-6 w-6 flex-shrink-0 rounded-base animate-pulse" />
            <div className="h-4 w-1/2 rounded-base bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="mt-3 h-3 w-20 rounded-base bg-muted animate-pulse" />
    </div>
  );
}

export function SorterContentSkeleton() {
  return (
    /* Two Column Layout - Match exact structure of SorterPageClient */
    <div className="grid gap-8 md:grid-cols-2">
      {/* Left Column - Items to Rank */}
      <section>
        <div className="mb-6 h-8 w-48 rounded-base bg-muted animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <RankingItemSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Right Column */}
      <section className="space-y-8">
        {/* Filters */}
        <div>
          <div className="mb-6 h-8 w-32 rounded-base bg-muted animate-pulse" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-20 rounded-base bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Recent Rankings */}
        <div>
          <div className="mb-6 h-8 w-56 rounded-base bg-muted animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <RecentRankingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
