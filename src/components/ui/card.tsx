import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { RETRO_BASE_CLASSES, createShadow, createDarkShadow, RETRO_COLORS } from "@/lib/retro-constants";

const cardVariants = cva(
  `${RETRO_BASE_CLASSES.border} ${createShadow('large', 'black')} ${createDarkShadow('large', 'grey')} transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-0`,
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

function Card({ 
  className, 
  variant, 
  ...props 
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 py-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-bold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm font-medium", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};
