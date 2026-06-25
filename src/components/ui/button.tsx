import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Magenta-gradient primary with a magenta glow shadow.
        default:
          "bg-[image:var(--main-gradient)] text-main-foreground shadow-[0_6px_18px_rgba(255,46,126,.35)] hover:brightness-110",
        noShadow: "bg-[image:var(--main-gradient)] text-main-foreground",
        // Outlined secondary on the dark surface.
        neutral:
          "border border-foreground/20 bg-transparent text-foreground hover:bg-foreground/5",
        neutralNoShadow:
          "border border-foreground/20 bg-transparent text-foreground",
        reverse:
          "bg-[image:var(--main-gradient)] text-main-foreground hover:brightness-110",
        ghost: "bg-transparent text-foreground hover:bg-foreground/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-8",
        icon: "size-10",
      },
      /**
       * The loud arcade label treatment: condensed display face, uppercase,
       * wide tracking. Opt-in (not every button wants it) — use on the big
       * hero/sorter CTAs to match the handoff. Bumps size a touch.
       */
      arcade: {
        true: "font-heading font-extrabold uppercase tracking-[0.04em] text-[1.05em]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      arcade: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  arcade,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, arcade, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
