import { Skeleton } from "@/components/ui/skeleton";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RankingItem, RankingItemContent } from "@/components/ui/ranking-item";

export function SorterPageSkeleton() {
  return (
    <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
      {/* Sorter Header Skeleton - Match exact structure */}
      <section className="mb-3">
        <div className="flex items-center space-x-3 py-4 md:space-x-6">
          {/* Cover Image Skeleton */}
          <div className="relative">
            <Skeleton className="h-28 w-28 md:h-48 md:w-48" />
          </div>
          
          {/* Sorter Info Skeleton */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-8 w-48 md:h-10 md:w-64" />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>

            {/* Desktop Action Buttons Skeleton */}
            <div className="mt-4 hidden items-center gap-4 md:flex">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Action Buttons Skeleton */}
      <div className="mb-8 flex items-center gap-4 md:hidden">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Two Column Layout - Match exact structure */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Items to Rank */}
        <section>
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Items to Rank</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <RankingItem
                    key={i}
                    className="bg-background text-foreground"
                  >
                    <RankingItemContent>
                      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                        {/* Thumbnail Skeleton */}
                        <Skeleton className="h-16 w-16 flex-shrink-0" />
                        {/* Item Name Skeleton */}
                        <div className="w-0 min-w-0 flex-1">
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </RankingItemContent>
                  </RankingItem>
                ))}
              </div>
            </PanelContent>
          </Panel>
        </section>

        {/* Right Column */}
        <section className="space-y-8">
          {/* Filters Panel Skeleton */}
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Filters</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-6 w-16" />
                ))}
              </div>
            </PanelContent>
          </Panel>

          {/* Recent Rankings Panel */}
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Recent Rankings</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Card key={i} className="bg-background text-foreground gap-2">
                    <CardHeader>
                      <Skeleton className="h-4 w-20" />
                    </CardHeader>
                    <CardContent>
                      {/* Top 3 Rankings Skeleton */}
                      <div className="mb-3 space-y-2">
                        {Array.from({ length: 3 }, (_, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <Skeleton className="h-6 w-6 flex-shrink-0" />
                              <Skeleton className="h-4 w-6 text-center" />
                              <Skeleton className="h-4 flex-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Date Skeleton */}
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </PanelContent>
          </Panel>
        </section>
      </div>
    </main>
  );
}