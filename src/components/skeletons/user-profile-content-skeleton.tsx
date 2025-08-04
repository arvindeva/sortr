import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";

export function UserProfileContentSkeleton() {
  return (
    <>
      {/* Sorters Section */}
      <section className="mb-8">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Sorters</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="flex min-h-[200px] items-center justify-center p-2 md:p-6">
            <Spinner size={32} />
          </PanelContent>
        </Panel>
      </section>

      {/* Rankings Section */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Rankings</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="flex min-h-[200px] items-center justify-center p-2 md:p-6">
            <Spinner size={32} />
          </PanelContent>
        </Panel>
      </section>
    </>
  );
}