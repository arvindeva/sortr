import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.ComponentProps<"h1"> {
  children: React.ReactNode;
}

function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <h1 className={cn("text-xl font-bold md:text-3xl", className)} {...props}>
      {children}
    </h1>
  );
}

export { PageHeader };
