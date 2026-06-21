import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Optional icon shown above the message. */
  icon?: React.ReactNode;
  /** Main message. */
  title: React.ReactNode;
  /** Optional supporting line. */
  description?: React.ReactNode;
  /** Optional action (e.g. a button). */
  action?: React.ReactNode;
  /** Use a softer error styling. */
  variant?: "default" | "error";
}

/**
 * Consistent empty / error placeholder used for "no results",
 * "failed to load", etc. Replaces the ad-hoc bordered boxes that were
 * copy-pasted across pages.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-base border border-dashed border-border bg-muted/40 px-6 py-12 text-center",
        variant === "error" &&
          "border-solid border-destructive/30 bg-destructive/5",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>
      ) : null}
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
