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
  const { data, isLoading, error } = usePopularSorters(initialData);

  if (isLoading) {
    return <HomepageSkeleton />;
  }

  if (error) {
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

  const popularSorters = data?.popularSorters || [];

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
