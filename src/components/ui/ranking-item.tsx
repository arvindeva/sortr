import * as React from "react";
import { cn } from "@/lib/utils";

function RankingItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ranking-item"
      className={cn(
        "rounded-base shadow-md border border-border bg-main text-main-foreground font-base flex flex-col overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function RankingItemContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ranking-item-content"
      className={cn("p-2", className)}
      {...props}
    />
  );
}

export { RankingItem, RankingItemContent };
