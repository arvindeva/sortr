import { Skeleton } from "@/components/ui/skeleton";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { SorterGridSkeleton } from "./sorter-grid-skeleton";

export function HomepageSkeleton() {
  return (
    <section className="w-full">
      <Panel variant="primary">
        <PanelHeader variant="primary">
          <PanelTitle>Popular Sorters</PanelTitle>
        </PanelHeader>
        <PanelContent variant="primary" className="p-2 md:p-6">
          <SorterGridSkeleton count={10} />
        </PanelContent>
      </Panel>
    </section>
  );
}
