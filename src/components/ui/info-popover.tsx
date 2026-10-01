"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const POPOVER_WIDTH = 256;
const EDGE_MARGIN = 12;

/**
 * A small "ⓘ" info affordance with a popover explanation. Works on both desktop
 * and mobile: click/tap toggles it (hover also opens it with a real mouse).
 * Closes on click-outside or Escape. Use for inline "what does this mean?" hints
 * where a full modal would be overkill.
 *
 * The popover is placed so it always fits on screen: it starts at the trigger's
 * left edge and slides left (and narrows on small screens) as needed. Placement
 * is measured before the popover renders, because an off-screen popover would
 * already have widened the page and skewed the measurement.
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
  const [place, setPlace] = React.useState<{ left: number; width: number }>({
    left: 0,
    width: POPOVER_WIDTH,
  });
  const ref = React.useRef<HTMLDivElement>(null);
  // Opened by mouse hover (not yet pinned by a click).
  const hoverOpened = React.useRef(false);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const viewport = document.documentElement.clientWidth;
    const anchor = el.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, viewport - EDGE_MARGIN * 2);
    const left = Math.min(
      Math.max(anchor.left, EDGE_MARGIN),
      viewport - EDGE_MARGIN - width,
    );
    setPlace({ left: left - anchor.left, width });
  };

  const show = () => {
    measure();
    setOpen(true);
  };

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
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || open) return;
        hoverOpened.current = true;
        show();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse" || !hoverOpened.current) return;
        hoverOpened.current = false;
        setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          // A click after hovering pins the popover open instead of closing it.
          if (hoverOpened.current) {
            hoverOpened.current = false;
            return;
          }
          if (open) setOpen(false);
          else show();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-main"
      >
        <Info size={16} />
      </button>

      {open && (
        <div
          role="tooltip"
          style={{ left: place.left, width: place.width }}
          className="absolute top-full z-30 mt-2 rounded-xl border border-border bg-popover p-3.5 text-left text-[13px] leading-relaxed text-muted-foreground shadow-[0_12px_32px_rgba(0,0,0,.35)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
