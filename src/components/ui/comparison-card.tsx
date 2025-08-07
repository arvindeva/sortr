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
    <div className={cn("flex flex-col items-center", className)} {...props}>
      {/* Main comparison card */}
      <div
        className="bg-secondary-background rounded-base border-border shadow-shadow flex w-full max-w-[300px] cursor-pointer flex-col overflow-hidden border-2 text-black transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:w-[300px] md:max-w-none"
        onClick={onClick}
      >
        {/* Image area - flush with top - fixed height to prevent layout shift */}
        <div className="relative w-full h-[300px] max-w-[300px] overflow-hidden md:h-[300px] md:max-w-none">
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
        <div className="border-border bg-main border-t-2 px-4 py-6 text-center">
          <h3 className="leading-tight font-semibold text-black md:text-lg">
            {title}
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
          className="mt-2"
        >
          Remove
        </Button>
      )}
    </div>
  );
}

export { ComparisonCard };
