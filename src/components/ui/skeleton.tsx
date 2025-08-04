import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-base bg-secondary-background border-border skeleton-shimmer border-2",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
