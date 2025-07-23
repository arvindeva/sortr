import { Skeleton } from "@/components/ui/skeleton";
import { Box } from "@/components/ui/box";

export function SortPageSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-0 py-8 text-black md:px-4 dark:text-white">
      {/* Header */}
      <div className="mb-6 px-2 md:px-0">
        {/* Title Box Skeleton */}
        <Box variant="primary" size="md" className="mb-6 block">
          <div>
            <Skeleton className="h-6 w-48" />
          </div>
        </Box>

        {/* Progress and Actions - Compact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-black dark:text-white">
            <Skeleton className="h-4 w-32" />
            <div className="hidden md:block">
              <div className="flex gap-1">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </div>

          {/* Progress Bar Skeleton */}
          <Skeleton className="h-4 w-full md:h-6" />

          {/* Mobile Action Buttons */}
          <div className="block md:hidden">
            <div className="flex gap-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
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

        {/* VS Divider - actual component since it's static */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-main border-border shadow-shadow rounded-base border-2 px-3 py-2">
            <span className="text-sm font-bold text-black">VS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonCardSkeleton() {
  return (
    <div className="bg-main border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY rounded-base cursor-pointer overflow-hidden border-2 transition-all duration-150 ease-in-out hover:shadow-none">
      {/* Image area skeleton - aspect square, flush with top */}
      <div className="aspect-square w-full">
        <Skeleton className="h-full w-full rounded-none border-none" />
      </div>

      {/* Text area with border separator */}
      <div className="border-border border-t-2 p-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
    </div>
  );
}
