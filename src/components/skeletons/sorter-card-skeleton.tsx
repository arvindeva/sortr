import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SorterCardSkeleton() {
  return (
    <div className="block w-full">
      {/* Use Card component to match SorterCard exactly */}
      <Card className="relative aspect-square overflow-hidden">
        {/* Background skeleton - remove border since Card already has one */}
        <Skeleton className="absolute inset-0 h-full w-full border-0" />

        {/* Title overlay skeleton - match actual SorterCard overlay */}
        <div className="bg-main absolute right-0 bottom-0 left-0 p-1.5 sm:p-3">
          <div className="flex h-6 items-center justify-center sm:h-8">
            <Skeleton className="h-3 w-24 border-0 sm:h-4 sm:w-32" />
          </div>
        </div>
      </Card>
    </div>
  );
}
