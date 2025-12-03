import React from "react";
import { cn } from "@/lib/utils";

interface SorterGridProps {
  children: React.ReactNode;
  className?: string;
}

export function SorterGrid({ children, className = "" }: SorterGridProps) {
  return (
    <div
      className={cn(
        "grid justify-center gap-2",
        "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
