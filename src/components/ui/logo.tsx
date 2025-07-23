import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const logoVariants = cva(
  "inline-block border-2 border-border shadow-shadow rounded-base hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all",
  {
    variants: {
      variant: {
        primary: "bg-main text-main-foreground",
        secondary: "bg-secondary-background text-foreground",
        accent: "bg-secondary-background text-foreground",
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

function Logo({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof logoVariants>) {
  return (
    <div
      data-slot="logo"
      className={cn(logoVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Logo, logoVariants };
