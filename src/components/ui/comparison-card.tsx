import * as React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const displayImageUrl = imageUrl;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset loading state when image URL changes
  React.useEffect(() => {
    if (displayImageUrl) {
      setImageLoaded(false);
      setImageError(false);

      // Check if image is already in cache by creating a new Image element
      const img = new Image();
      img.onload = () => {
        // Image is cached, show it immediately
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageError(true);
      };
      img.src = displayImageUrl;
    }
  }, [displayImageUrl]);

  // Show letter placeholder if no image URL, image failed, or image hasn't loaded yet
  const showPlaceholder = !displayImageUrl || imageError || !imageLoaded;

  // Show shimmer animation when there's an image URL but it's still loading (not failed)
  const showShimmer = displayImageUrl && !imageLoaded && !imageError;

  return (
    <div className={cn("flex flex-col items-center", className)} {...props}>
      {/* Main comparison card */}
      <div
        className="bg-main rounded-base border-border shadow-shadow flex w-full max-w-[300px] cursor-pointer flex-col overflow-hidden border-2 text-black transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:w-[300px] md:max-w-none"
        onClick={onClick}
      >
        {/* Image area - flush with top */}
        <div className="relative aspect-square w-full max-w-[300px] overflow-hidden md:h-[300px] md:max-w-none">
          {/* Letter placeholder - always rendered, hidden when image loads */}
          <div
            className={cn(
              "bg-secondary-background absolute inset-0 flex items-center justify-center transition-opacity duration-200",
              showPlaceholder ? "opacity-100" : "opacity-0",
              showShimmer && "animate-pulse", // Default pulse when loading
            )}
          >
            <span className="text-primary text-lg font-bold md:text-4xl">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Actual image - hidden until loaded */}
          {displayImageUrl && (
            <img
              src={displayImageUrl}
              alt={title}
              className={cn(
                "h-full w-full object-cover transition-opacity duration-150",
                imageLoaded && !imageError ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              // Add loading="eager" to prioritize loading since we're preloading
              loading="eager"
            />
          )}
        </div>

        {/* Text area at bottom */}
        <div className="border-border border-t-2 px-4 py-6 text-center">
          <h3 className="leading-tight font-semibold text-black md:text-lg">
            {title}
          </h3>
        </div>
      </div>

      {/* Remove button below the card */}
      {canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering card selection
            onRemove?.();
          }}
          className="mt-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 border-2 border-border shadow-shadow transition-all hover:shadow-md"
          style={{ minWidth: '32px', minHeight: '32px' }} // Ensure adequate touch target
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { ComparisonCard };
