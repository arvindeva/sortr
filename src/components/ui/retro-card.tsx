import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RETRO_BASE_CLASSES, createShadow, createDarkShadow, RETRO_COLORS } from "@/lib/retro-constants";

const retroCardVariants = cva(
  `${RETRO_BASE_CLASSES.border} ${createShadow('large', 'black')} ${createDarkShadow('large', 'grey')} transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(64,64,64,1)] flex flex-col gap-0`,
  {
    variants: {
      variant: {
        default: `${RETRO_COLORS.neutral.light} ${RETRO_COLORS.neutral.dark} ${RETRO_COLORS.neutral.text} ${RETRO_COLORS.neutral.darkText}`,
        primary: `${RETRO_COLORS.primary.light} ${RETRO_COLORS.primary.dark} ${RETRO_COLORS.primary.text} ${RETRO_COLORS.primary.darkText}`,
        accent: `${RETRO_COLORS.accent.light} ${RETRO_COLORS.accent.dark} ${RETRO_COLORS.accent.text} ${RETRO_COLORS.accent.darkText}`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function RetroCard({ 
  className, 
  variant, 
  ...props 
}: React.ComponentProps<"div"> & VariantProps<typeof retroCardVariants>) {
  return (
    <div
      data-slot="retro-card"
      className={cn(retroCardVariants({ variant }), className)}
      {...props}
    />
  );
}

function RetroCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 py-6 has-data-[slot=retro-card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function RetroCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-title"
      className={cn("leading-none font-bold", className)}
      {...props}
    />
  );
}

function RetroCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-description"
      className={cn("text-muted-foreground text-sm font-medium", className)}
      {...props}
    />
  );
}

function RetroCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function RetroCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  );
}

function RetroCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="retro-card-footer"
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

export {
  RetroCard,
  RetroCardHeader,
  RetroCardFooter,
  RetroCardTitle,
  RetroCardAction,
  RetroCardDescription,
  RetroCardContent,
};