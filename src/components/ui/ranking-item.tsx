import * as React from "react";
import { cn } from "@/lib/utils";

function RankingItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ranking-item"
      className={cn(
        "rounded-base flex flex-col shadow-shadow border-2 border-border bg-main text-main-foreground font-base overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function RankingItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ranking-item-content"
      className={cn("p-2", className)}
      {...props}
    />
  );
}

export {
  RankingItem,
  RankingItemContent,
};