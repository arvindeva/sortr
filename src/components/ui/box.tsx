import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RETRO_BASE_CLASSES } from "@/lib/retro-constants";

const boxVariants = cva(
  `inline-block ${RETRO_BASE_CLASSES.border}`,
  {
    variants: {
      variant: {
        primary: "bg-yellow-300 text-black dark:bg-yellow-300",
        secondary: "bg-pink-300 text-black dark:bg-pink-400",
        accent: "bg-cyan-300 text-black dark:bg-cyan-400",
        warning: "bg-orange-300 text-black dark:bg-orange-400",
        success: "bg-green-300 text-black dark:bg-green-400",
        purple: "bg-purple-300 text-black dark:bg-purple-400",
        neutral: "bg-gray-300 text-black dark:bg-gray-400",
        white: "bg-white text-black dark:bg-neutral-800 dark:text-white",
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