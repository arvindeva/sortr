import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isImagePreloaded } from "@/lib/preload-store";

interface ComparisonCardProps extends React.ComponentProps<"div"> {
  imageUrl?: string;
  title: string;
  onClick?: () => void;
  canRemove?: boolean;
  onRemove?: () => void;
}

function ComparisonCard({
  className,
  imageUrl,
  title,
  onClick,
  canRemove,
  onRemove,
  ...props
}: ComparisonCardProps) {
  // Check if image is preloaded (simple Set lookup - no memoization needed)
  const imageIsPreloaded = imageUrl ? isImagePreloaded(imageUrl) : false;

  return (
    <div className={cn("flex flex-col md:items-center", className)} {...props}>
      {/* Main comparison card */}
      <div
        className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-base border border-border bg-card shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-main/40 hover:shadow-xl"
        onClick={onClick}
      >
        {/* Image area - square aspect ratio */}
        <div className="relative w-full aspect-square overflow-hidden">
          {/* Always render both elements - use visibility instead of opacity to avoid any rendering delays */}

          {/* Placeholder - always mounted */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-secondary"
            style={{
              visibility: imageIsPreloaded && imageUrl ? 'hidden' : 'visible'
            }}
          >
            <span className="text-lg font-semibold text-muted-foreground/40 md:text-4xl">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Image - always mounted when imageUrl exists */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              style={{
                visibility: imageIsPreloaded ? 'visible' : 'hidden'
              }}
            />
          )}
        </div>

        {/* Text area at bottom */}
        <div className="border-t border-border bg-main px-2 py-2 text-center sm:px-4 sm:py-3 md:py-4">
          <h3 className="flex min-h-[2rem] items-center justify-center font-semibold leading-tight text-main-foreground line-clamp-2 sm:min-h-[2.5rem] md:min-h-[3rem]">
            <span className="hidden sm:block" style={{ fontSize: '1.125rem' }}>
              {title}
            </span>
            <span className="block sm:hidden" style={{ fontSize: '0.75rem' }}>
              {title}
            </span>
          </h3>
        </div>
      </div>

      {/* Remove button below the card */}
      {canRemove && (
        <Button
          variant="neutral"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering card selection
            onRemove?.();
          }}
          className="mt-2 text-xs sm:text-sm"
        >
          Remove
        </Button>
      )}
    </div>
  );
}

export { ComparisonCard };
