"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small "ⓘ" info affordance with a popover explanation. Works on both desktop
 * and mobile: click/tap toggles it (hover also opens it on devices that hover).
 * Closes on click-outside or Escape. Use for inline "what does this mean?" hints
 * where a full modal would be overkill.
 */
export function InfoPopover({
  children,
  label = "More info",
  className,
}: {
  children: React.ReactNode;
  /** Accessible label for the trigger button. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-main"
      >
        <Info size={16} />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border border-border bg-popover p-3.5 text-left text-[13px] leading-relaxed text-muted-foreground shadow-[0_12px_32px_rgba(0,0,0,.35)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
