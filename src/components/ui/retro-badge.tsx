import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RETRO_BORDERS, createShadow, createDarkShadow, RETRO_ANIMATIONS } from "@/lib/retro-constants";

const retroBadgeVariants = cva(
  `inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none border ${RETRO_BORDERS.color.light} ${RETRO_BORDERS.color.dark} ${createShadow('small', 'black')} ${createDarkShadow('small', 'grey')} ${RETRO_ANIMATIONS.press.base} ${RETRO_ANIMATIONS.press.hover}`,
  {
    variants: {
      variant: {
        default: "bg-cyan-300 text-black dark:bg-cyan-400",
        secondary: "bg-pink-300 text-black dark:bg-pink-400",
        destructive: "bg-red-300 text-black dark:bg-red-400",
        success: "bg-green-300 text-black dark:bg-green-400",
        warning: "bg-yellow-300 text-black dark:bg-yellow-400",
        purple: "bg-purple-300 text-black dark:bg-purple-400",
        orange: "bg-orange-300 text-black dark:bg-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function RetroBadge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof retroBadgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="retro-badge"
      className={cn(retroBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { RetroBadge, retroBadgeVariants };