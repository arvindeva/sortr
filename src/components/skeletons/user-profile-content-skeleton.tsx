import { SorterGrid } from "@/components/ui/sorter-grid";

function SorterCardSkeleton() {
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-base bg-muted animate-pulse" />
  );
}

function RankingCardSkeleton() {
  return (
    <div className="border-border rounded-base bg-card h-full border p-4 shadow-sm">
      <div className="mb-3 h-5 w-2/3 rounded-base bg-muted animate-pulse" />
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

export function UserProfileContentSkeleton() {
  return (
    <>
      {/* Sorters Section */}
      <section className="mb-8">
        <div className="mb-6 h-8 w-40 rounded-base bg-muted animate-pulse" />
        <SorterGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <SorterCardSkeleton key={i} />
          ))}
        </SorterGrid>
      </section>

      {/* Rankings Section */}
      <section>
        <div className="mb-6 h-8 w-40 rounded-base bg-muted animate-pulse" />
        <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <RankingCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </>
  );
}
