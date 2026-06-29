import * as React from "react";
import { cn } from "@/lib/utils";
import { isImagePreloaded } from "@/lib/preload-store";
import { accentFor } from "@/lib/utils";

interface ComparisonCardProps extends React.ComponentProps<"div"> {
  imageUrl?: string;
  title: string;
  onClick?: () => void;
  canRemove?: boolean;
  onRemove?: () => void;
  /** Which contender — drives the hover glow (cyan left / magenta right). */
  side?: "left" | "right";
}

function ComparisonCard({
  className,
  imageUrl,
  title,
  onClick,
  canRemove,
  onRemove,
  side = "right",
  ...props
}: ComparisonCardProps) {
  const imageIsPreloaded = imageUrl ? isImagePreloaded(imageUrl) : false;
  // Magenta (primary) on the left for brand consistency, cyan on the right.
  const glow =
    side === "left"
      ? "hover:border-main hover:shadow-[0_0_48px_rgba(255,46,126,.4)]"
      : "hover:border-cyan hover:shadow-[0_0_48px_rgba(25,227,223,.4)]";

  return (
    <div className={cn("flex h-full flex-col", className)} {...props}>
      {/* Main comparison card */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`Pick ${title}`}
        className={cn(
          "group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-all duration-200 hover:-translate-y-1.5",
          glow,
        )}
      >
        {/* Cover — colored tile (with stripe) or image */}
        <div className="relative aspect-square w-full overflow-hidden">
          {/* Colored placeholder tile with the name, always mounted */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 text-center"
            style={{
              background: accentFor(title),
              visibility: imageIsPreloaded && imageUrl ? "hidden" : "visible",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 16px, transparent 16px 32px)",
              }}
            />
            <span
              className="display relative text-2xl font-extrabold sm:text-4xl"
              style={{ color: "rgba(0,0,0,.74)" }}
            >
              {title}
            </span>
          </div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              style={{ visibility: imageIsPreloaded ? "visible" : "hidden" }}
            />
          )}
        </div>

        {/* Name bar — dark "label plate" in both themes, white text. Grows to
            fill remaining height; the title reserves 2 lines so a 1-line name
            doesn't make this card shorter than a 2-line neighbour. */}
        <div
          className="flex flex-1 items-center justify-center px-3 py-3.5 text-center md:py-4"
          style={{ background: "var(--name-plate)" }}
        >
          <h3 className="display line-clamp-2 flex min-h-[2.1em] items-center text-base font-extrabold leading-[1.05] text-white sm:text-[25px]">
            {title}
          </h3>
        </div>
      </button>

      {/* Remove link below the card */}
      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="mt-2.5 self-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕ remove
        </button>
      )}
    </div>
  );
}

export { ComparisonCard };
