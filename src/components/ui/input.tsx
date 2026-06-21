import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-10 w-full rounded-base border border-border bg-background px-3 py-2 text-base text-foreground transition-colors selection:bg-main selection:text-main-foreground placeholder:text-muted-foreground file:border-0 file:bg-transparent file:font-medium focus-visible:border-main focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };
