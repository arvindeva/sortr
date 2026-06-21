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
        "rounded-base border border-border bg-muted relative h-4 w-full overflow-hidden",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-main relative h-full w-full flex-1 overflow-hidden transition-all",
          shimmer && "progress-shimmer",
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
