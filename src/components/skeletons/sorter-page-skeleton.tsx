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
    <>
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
    </>
  );
}