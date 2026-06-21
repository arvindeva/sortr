import { PageContainer } from "@/components/ui/page-container";
import { SorterGrid } from "@/components/ui/sorter-grid";

function SorterCardSkeleton() {
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-base bg-muted animate-pulse" />
  );
}

function SorterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <SorterGrid>
      {Array.from({ length: count }).map((_, i) => (
        <SorterCardSkeleton key={i} />
      ))}
    </SorterGrid>
  );
}

export function HomepageSkeleton() {
  return (
    <PageContainer className="flex min-h-[calc(100vh-64px)] flex-col gap-16">
      {/* Hero Section */}
      <section className="w-full">
        <div className="h-64 w-full rounded-base bg-muted animate-pulse md:h-80" />
      </section>

      {/* Popular Sorters */}
      <section className="w-full">
        <div className="mb-6 h-8 w-48 rounded-base bg-muted animate-pulse" />
        <SorterGridSkeleton count={10} />
      </section>

      {/* Recent Sorters */}
      <section className="w-full">
        <div className="mb-6 h-8 w-48 rounded-base bg-muted animate-pulse" />
        <SorterGridSkeleton count={10} />
      </section>
    </PageContainer>
  );
}
