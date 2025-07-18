import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RETRO_BASE_CLASSES, createShadow, createDarkShadow } from "@/lib/retro-constants";

const retroButtonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${RETRO_BASE_CLASSES.border} ${RETRO_BASE_CLASSES.pressAnimation} cursor-pointer`,
  {
    variants: {
      variant: {
        default: `bg-yellow-300 text-black border-black ${createShadow('medium', 'black')} hover:shadow-none dark:bg-yellow-300 dark:text-black dark:border-black ${createDarkShadow('medium', 'grey')} dark:hover:shadow-none`,
        secondary: `bg-black text-white border-black ${createShadow('medium', 'yellow')} hover:shadow-none dark:bg-gray-500 dark:text-white dark:border-black ${createDarkShadow('medium', 'yellow')} dark:hover:shadow-none`,
        outline: `bg-transparent text-black border-black ${createShadow('medium', 'black')} hover:shadow-none dark:bg-transparent dark:text-white dark:border-white ${createDarkShadow('medium', 'grey')} dark:hover:shadow-none`,
        ghost: `bg-transparent text-black ${createShadow('medium', 'black')} hover:shadow-none dark:bg-transparent dark:text-white ${createDarkShadow('medium', 'grey')} dark:hover:shadow-none`,
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-10 px-3 text-xs",
        lg: "h-14 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface RetroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof retroButtonVariants> {
  asChild?: boolean;
}

const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(retroButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
RetroButton.displayName = "RetroButton";

export { RetroButton, retroButtonVariants };