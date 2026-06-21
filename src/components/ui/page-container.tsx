import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pageContainerVariants = cva("container mx-auto w-full px-4 md:px-6", {
  variants: {
    width: {
      // Standard content width used across most pages
      default: "max-w-6xl",
      // Narrower for reading-focused / form pages
      narrow: "max-w-3xl",
      // Wide for dense grids
      wide: "max-w-7xl",
    },
    spacing: {
      default: "py-8 md:py-12",
      tight: "py-4 md:py-6",
      none: "",
    },
  },
  defaultVariants: {
    width: "default",
    spacing: "default",
  },
});

interface PageContainerProps
  extends React.ComponentProps<"main">,
    VariantProps<typeof pageContainerVariants> {}

/**
 * The standard page shell: centered container, consistent max-width and
 * responsive padding. Use on every page so layout spacing stays uniform
 * instead of being re-declared per page.
 */
export function PageContainer({
  className,
  width,
  spacing,
  ...props
}: PageContainerProps) {
  return (
    <main
      className={cn(pageContainerVariants({ width, spacing }), className)}
      {...props}
    />
  );
}
