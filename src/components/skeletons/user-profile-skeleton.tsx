import { Skeleton } from "@/components/ui/skeleton";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { SorterGridSkeleton } from "./sorter-grid-skeleton";

export function UserProfileSkeleton() {
  return (
    <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
      {/* Profile Header Skeleton - Match actual UserProfileHeader */}
      <section className="mb-4 md:mb-8">
        <div className="flex items-center space-x-3 py-4 md:space-x-6">
          {/* Avatar skeleton - match actual size and styling */}
          <div className="relative">
            <Skeleton className="h-28 w-28 md:h-48 md:w-48" />
          </div>
          
          {/* User info skeleton */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-8 w-32 md:h-10 md:w-40" />
            </div>
            <Skeleton className="h-4 w-28 md:w-32" />
          </div>
        </div>
      </section>

      {/* Sorters Section Skeleton */}
      <section className="mb-8">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Sorters</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            <SorterGridSkeleton count={6} />
          </PanelContent>
        </Panel>
      </section>

      {/* Rankings Section Skeleton */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Rankings</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-lg border-2 border-border p-4 shadow-shadow"
                >
                  <div className="mb-3 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }, (_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}