import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps extends React.ComponentProps<"div"> {
  /** Heading text. */
  children: React.ReactNode;
  /** Optional supporting line under the heading. */
  description?: React.ReactNode;
  /** Optional content aligned to the right (e.g. a button or count). */
  action?: React.ReactNode;
  /** Heading element to render. Defaults to h2. */
  as?: "h1" | "h2" | "h3";
}

/**
 * A section title in the new design — used for the "Popular Sorters" /
 * "Recent Sorters" style headings and any titled block across pages.
 * Keeps heading size, optional description, and a right-aligned action
 * slot consistent everywhere.
 */
export function SectionHeading({
  children,
  description,
  action,
  as: Heading = "h2",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
      {...props}
    >
      <div className="space-y-1">
        <Heading className="text-2xl font-bold tracking-tight md:text-3xl">
          {children}
        </Heading>
        {description ? (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
