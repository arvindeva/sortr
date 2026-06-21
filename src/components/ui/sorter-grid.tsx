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
        "grid justify-center gap-4 md:gap-6",
        "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
