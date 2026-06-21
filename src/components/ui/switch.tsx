"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-main data-[state=unchecked]:bg-muted inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
