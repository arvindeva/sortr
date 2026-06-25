import * as React from "react";
import { cn } from "@/lib/utils";

interface ArcadePageHeaderProps {
  /** Small mono eyebrow above the title (e.g. "5,243 sorters live"). */
  eyebrow?: React.ReactNode;
  /** Glyph before the eyebrow — "●" (default) or "▶". Colored cyan. */
  eyebrowGlyph?: string | null;
  /** The big uppercase display title. */
  title: React.ReactNode;
  /** Optional supporting line under the title. */
  subtitle?: React.ReactNode;
  /** Optional content aligned to the right of the title (buttons, etc.). */
  actions?: React.ReactNode;
  /** Heading level. Defaults to h1. */
  as?: "h1" | "h2";
  /** Title size. "page" = hero size; "section" = smaller section title. */
  size?: "page" | "section";
  className?: string;
}

/**
 * The recurring VERSUS-arcade page header: a cyan mono eyebrow, a big uppercase
 * Big Shoulders title, and an optional subtitle — used across browse, create,
 * profile, result, and the sorter page so every screen opens the same way.
 */
export function ArcadePageHeader({
  eyebrow,
  eyebrowGlyph = "●",
  title,
  subtitle,
  actions,
  as: Heading = "h1",
  size = "page",
  className,
}: ArcadePageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="hud mb-2.5 text-xs text-cyan-ink">
            {eyebrowGlyph ? `${eyebrowGlyph} ` : ""}
            {eyebrow}
          </div>
        ) : null}
        <Heading
          className={cn(
            "display font-black text-foreground",
            size === "page"
              ? "text-[clamp(2.5rem,7vw,4rem)]"
              : "text-3xl md:text-[34px]",
          )}
        >
          {title}
        </Heading>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
