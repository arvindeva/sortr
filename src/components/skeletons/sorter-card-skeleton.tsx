import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SorterCardSkeleton() {
  return (
    <div className="block w-full">
      {/* Use Card component to match SorterCard exactly */}
      <Card className="relative aspect-square overflow-hidden">
        {/* Background skeleton - remove border since Card already has one */}
        <Skeleton className="absolute inset-0 h-full w-full border-0" />

        {/* Title placeholder — bottom-left, matching the real card's title. */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <Skeleton className="h-4 w-2/3 border-0" />
        </div>
      </Card>
    </div>
  );
}
