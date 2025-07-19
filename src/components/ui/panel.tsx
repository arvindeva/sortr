import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const panelVariants = cva(
  "border-2 border-border shadow-shadow overflow-hidden rounded-base",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        primary: "bg-background text-foreground",
        accent: "bg-background text-foreground",
        secondary: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const panelHeaderVariants = cva(
  "px-6 py-4 border-b-2 border-border",
  {
    variants: {
      variant: {
        default: "bg-secondary-background text-foreground",
        primary: "bg-main text-main-foreground",
        accent: "bg-secondary-background text-foreground",
        secondary: "bg-secondary-background text-foreground",
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
      className={cn("text-lg leading-none font-heading", className)}
      {...props}
    />
  );
}

const panelContentVariants = cva("p-6", {
  variants: {
    variant: {
      default: "bg-background text-foreground",
      primary: "bg-background text-foreground",
      accent: "bg-background text-foreground",
      secondary: "bg-background text-foreground",
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
