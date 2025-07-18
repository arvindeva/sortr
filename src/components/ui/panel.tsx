import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  RETRO_BASE_CLASSES,
  createShadow,
  createDarkShadow,
} from "@/lib/retro-constants";

const panelVariants = cva(
  `border-2 border-black dark:border-black ${createShadow("large", "black")} ${createDarkShadow("large", "grey")} overflow-hidden`,
  {
    variants: {
      variant: {
        default: "bg-white dark:bg-neutral-800 text-black dark:text-white",
        primary: "bg-white dark:bg-neutral-800 text-black dark:text-white",
        accent: "bg-cyan-300 dark:bg-cyan-400 text-black dark:text-black",
        secondary: "bg-pink-300 dark:bg-pink-400 text-black dark:text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const panelHeaderVariants = cva(
  "px-6 py-4 border-b-2 border-black dark:border-black",
  {
    variants: {
      variant: {
        default: "bg-gray-100 dark:bg-neutral-700",
        primary: "bg-yellow-300 dark:bg-yellow-300 text-black dark:text-black",
        accent: "bg-cyan-400 dark:bg-cyan-500",
        secondary: "bg-pink-400 dark:bg-pink-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Panel({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof panelVariants>) {
  return (
    <div
      data-slot="panel"
      className={cn(panelVariants({ variant }), className)}
      {...props}
    />
  );
}

function PanelHeader({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof panelHeaderVariants>) {
  return (
    <div
      data-slot="panel-header"
      className={cn(panelHeaderVariants({ variant }), className)}
      {...props}
    />
  );
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="panel-title"
      className={cn("text-lg leading-none font-bold", className)}
      {...props}
    />
  );
}

const panelContentVariants = cva("p-6", {
  variants: {
    variant: {
      default: "bg-inherit",
      primary: "bg-white dark:bg-neutral-800",
      accent: "bg-inherit",
      secondary: "bg-inherit",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function PanelContent({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof panelContentVariants>) {
  return (
    <div
      data-slot="panel-content"
      className={cn(panelContentVariants({ variant }), className)}
      {...props}
    />
  );
}

export {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
  panelVariants,
  panelContentVariants,
};
