"use client";

import { usePopularSorters } from "@/hooks/api";
import { HomepageSkeleton } from "@/components/skeletons";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import type { HomepageData } from "@/hooks/api/use-homepage";

interface HomepageClientProps {
  initialData?: HomepageData;
}

export function HomepageClient({ initialData }: HomepageClientProps) {
  const { data, isPending, error } = usePopularSorters(initialData);

  // Use initialData as fallback if data is not yet available
  // This ensures we show SSR data immediately while background fetch happens
  const displayData = data || initialData;

  // Only show skeleton when there's no data available at all
  if (isPending && !displayData) {
    return <HomepageSkeleton />;
  }

  if (error && !displayData) {
    return (
      <section className="w-full">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Popular Sorters</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            <div className="text-center">
              <Box variant="warning" size="md">
                <p className="font-medium">
                  Failed to load popular sorters. Please try again.
                </p>
              </Box>
            </div>
          </PanelContent>
        </Panel>
      </section>
    );
  }

  const popularSorters = displayData?.popularSorters || [];

  return (
    <section className="w-full">
      <Panel variant="primary">
        <PanelHeader variant="primary">
          <PanelTitle>Popular Sorters</PanelTitle>
        </PanelHeader>
        <PanelContent variant="primary" className="p-2 md:p-6">
          {popularSorters.length === 0 ? (
            <div className="text-center">
              <Box variant="warning" size="md">
                <p className="font-medium">No sorters available yet.</p>
              </Box>
            </div>
          ) : (
            <SorterGrid>
              {popularSorters.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          )}
        </PanelContent>
      </Panel>
    </section>
  );
}
