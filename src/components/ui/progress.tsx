"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  shimmer = false,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  value?: number;
  shimmer?: boolean;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "rounded-base border-border bg-secondary-background relative h-4 w-full overflow-hidden border-2",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "border-border bg-main h-full w-full flex-1 border-r-2 transition-all relative overflow-hidden",
          shimmer && "progress-shimmer"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
