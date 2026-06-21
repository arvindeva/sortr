import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boxVariants = cva(
  "inline-block shadow-md rounded-base border border-border",
  {
    variants: {
      variant: {
        primary: "bg-main text-main-foreground border-transparent",
        secondary: "bg-secondary-background text-foreground",
        accent: "bg-accent text-accent-foreground",
        warning: "bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-800",
        success: "bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800",
        purple: "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800",
        neutral: "bg-muted text-foreground",
        white: "bg-background text-foreground",
      },
      size: {
        sm: "px-3 md:px-4 py-2",
        md: "px-4 md:px-6 py-3 text-base",
        lg: "px-6 md:px-8 py-4 text-lg",
        xl: "px-8 md:px-10 py-6 text-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Box({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof boxVariants>) {
  return (
    <div
      data-slot="box"
      className={cn(boxVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Box, boxVariants };
