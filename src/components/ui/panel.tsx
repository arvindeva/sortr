import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const panelVariants = cva(
  "border border-border shadow-lg overflow-hidden rounded-base",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground",
        primary: "bg-card text-foreground",
        accent: "bg-accent text-accent-foreground",
        secondary: "bg-secondary text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const panelHeaderVariants = cva("px-3 md:px-6 py-4 border-b border-border", {
  variants: {
    variant: {
      default: "bg-card text-foreground",
      primary: "bg-main text-main-foreground",
      accent: "bg-accent text-accent-foreground",
      secondary: "bg-secondary text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

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

function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="panel-title"
      className={cn("text-lg leading-none font-bold", className)}
      {...props}
    />
  );
}

const panelContentVariants = cva("p-6", {
  variants: {
    variant: {
      default: "bg-card text-foreground",
      primary: "bg-card text-foreground",
      accent: "bg-accent text-accent-foreground",
      secondary: "bg-secondary text-foreground",
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
