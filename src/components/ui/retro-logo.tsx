import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RETRO_BASE_CLASSES, createShadow, createDarkShadow } from "@/lib/retro-constants";

const retroLogoVariants = cva(
  `inline-block ${RETRO_BASE_CLASSES.border} ${createShadow('large', 'black')} ${createDarkShadow('large', 'grey')} ${RETRO_BASE_CLASSES.pressAnimation}`,
  {
    variants: {
      variant: {
        primary: "bg-yellow-300 text-black dark:bg-yellow-300",
        secondary: "bg-pink-300 text-black dark:bg-pink-400",
        accent: "bg-cyan-300 text-black dark:bg-cyan-400",
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

function RetroLogo({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof retroLogoVariants>) {
  return (
    <div
      data-slot="retro-logo"
      className={cn(retroLogoVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { RetroLogo, retroLogoVariants };