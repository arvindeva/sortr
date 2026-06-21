import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "rounded-base border border-border bg-background text-foreground transition-colors selection:bg-main selection:text-main-foreground placeholder:text-muted-foreground flex min-h-[80px] w-full px-3 py-2 text-base focus-visible:border-main focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-background focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
