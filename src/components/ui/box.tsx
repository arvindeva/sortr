import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boxVariants = cva(
  "inline-block border-2 border-border shadow-shadow rounded-base",
  {
    variants: {
      variant: {
        primary: "bg-main text-main-foreground",
        secondary: "bg-secondary-background text-foreground",
        accent: "bg-secondary-background text-foreground",
        warning: "bg-secondary-background text-foreground",
        success: "bg-secondary-background text-foreground",
        purple: "bg-secondary-background text-foreground",
        neutral: "bg-secondary-background text-foreground",
        white: "bg-background text-foreground",
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
        xl: "px-10 py-6 text-xl",
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