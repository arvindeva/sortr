import { Skeleton } from "@/components/ui/skeleton";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RankingItem, RankingItemContent } from "@/components/ui/ranking-item";
import { Spinner } from "@/components/ui/spinner";

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
            <PanelContent variant="primary" className="flex min-h-[300px] items-center justify-center p-2 md:p-6">
              <Spinner size={32} />
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
            <PanelContent variant="primary" className="flex min-h-[100px] items-center justify-center p-2 md:p-6">
              <Spinner size={24} />
            </PanelContent>
          </Panel>

          {/* Recent Rankings Panel */}
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Recent Rankings</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="flex min-h-[200px] items-center justify-center p-2 md:p-6">
              <Spinner size={32} />
            </PanelContent>
          </Panel>
        </section>
      </div>
    </main>
  );
}