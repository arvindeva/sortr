import * as React from "react";
import { cn } from "@/lib/utils";

interface ComparisonCardProps extends React.ComponentProps<"div"> {
  imageUrl?: string;
  title: string;
  onClick?: () => void;
}

function ComparisonCard({
  className,
  imageUrl,
  title,
  onClick,
  ...props
}: ComparisonCardProps) {
  return (
    <div
      className={cn(
        "bg-main rounded-base border-border shadow-shadow flex cursor-pointer flex-col overflow-hidden border-2 text-black transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md w-full max-w-[300px] md:w-[300px] md:max-w-none",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {/* Image area - flush with top */}
      {imageUrl ? (
        <div className="aspect-square w-full max-w-[300px] overflow-hidden md:h-[300px] md:max-w-none">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-secondary-background flex aspect-square w-full max-w-[300px] items-center justify-center md:h-[300px] md:max-w-none">
          <span className="text-primary text-lg font-bold md:text-4xl">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Text area at bottom */}
      <div className="border-border border-t-2 px-4 py-6 text-center">
        <h3 className="text-sm leading-tight font-semibold text-black md:text-lg">
          {title}
        </h3>
      </div>
    </div>
  );
}

export { ComparisonCard };
