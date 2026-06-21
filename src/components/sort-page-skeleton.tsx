export function SortPageSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-0 py-8 text-foreground md:px-4">
      {/* Header */}
      <div className="mb-6 px-2 md:px-0">
        {/* Title Skeleton */}
        <div className="mb-6 h-8 w-64 rounded-base bg-muted animate-pulse md:h-9" />

        {/* Progress and Actions - Compact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 rounded-base bg-muted animate-pulse" />
            <div className="hidden md:block">
              <div className="flex gap-1">
                <div className="h-7 w-16 rounded-base bg-muted animate-pulse" />
                <div className="h-7 w-16 rounded-base bg-muted animate-pulse" />
              </div>
            </div>
          </div>

          {/* Progress Bar Skeleton */}
          <div className="h-4 w-full rounded-base bg-muted animate-pulse md:h-6" />

          {/* Mobile Action Buttons */}
          <div className="block md:hidden">
            <div className="flex gap-1">
              <div className="h-7 w-16 rounded-base bg-muted animate-pulse" />
              <div className="h-7 w-16 rounded-base bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="relative grid grid-cols-2 items-stretch gap-2 px-0 md:gap-4 md:px-0">
        {/* Item A Skeleton */}
        <div className="md:mx-auto md:w-80">
          <ComparisonCardSkeleton />
        </div>

        {/* Item B Skeleton */}
        <div className="md:mx-auto md:w-80">
          <ComparisonCardSkeleton />
        </div>

        {/* VS Divider - matches the homepage duel badge */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm font-bold tracking-tight text-foreground shadow-md">
            VS
          </span>
        </div>
      </div>
    </div>
  );
}

function ComparisonCardSkeleton() {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-base border border-border bg-card shadow-md">
      {/* Image area skeleton - aspect square, flush with top */}
      <div className="aspect-square w-full bg-muted animate-pulse" />

      {/* Text area with border separator */}
      <div className="border-t border-border p-4">
        <div className="mx-auto h-5 w-3/4 rounded-base bg-muted animate-pulse" />
      </div>
    </div>
  );
}
