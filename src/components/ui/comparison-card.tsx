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
        className="bg-secondary-background rounded-base border-border shadow-shadow flex w-full cursor-pointer flex-col overflow-hidden border-2 text-black transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md"
        onClick={onClick}
      >
        {/* Image area - square aspect ratio */}
        <div className="relative w-full aspect-square overflow-hidden">
          {/* Always render both elements - use visibility instead of opacity to avoid any rendering delays */}
          
          {/* Placeholder - always mounted */}
          <div 
            className="bg-secondary-background absolute inset-0 flex items-center justify-center"
            style={{ 
              visibility: imageIsPreloaded && imageUrl ? 'hidden' : 'visible' 
            }}
          >
            <span className="text-primary text-lg font-bold md:text-4xl">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Image - always mounted when imageUrl exists */}
          <div 
            className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
              visibility: imageIsPreloaded && imageUrl ? 'visible' : 'hidden'
            }}
          />
        </div>

        {/* Text area at bottom - restore pink background */}
        <div className="border-border bg-main border-t-2 px-2 py-2 sm:px-4 sm:py-3 md:py-4 text-center">
          <h3 className="leading-tight font-semibold text-black line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] flex items-center justify-center">
            <span className="hidden sm:block" style={{fontSize: '1.125rem'}}>
              {title}
            </span>
            <span className="block sm:hidden" style={{fontSize: '0.75rem'}}>
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
