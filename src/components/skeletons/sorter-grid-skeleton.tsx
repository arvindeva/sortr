import { Spinner } from "@/components/ui/spinner";

interface SorterGridSkeletonProps {
  count?: number;
}

export function SorterGridSkeleton({ count = 10 }: SorterGridSkeletonProps) {
  return (
    <div className="py-8">
      <Spinner size={32} />
    </div>
  );
}
