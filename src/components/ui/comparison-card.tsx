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
        "bg-main text-black rounded-base border-2 border-border shadow-shadow cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md overflow-hidden flex flex-col",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Image area - flush with top */}
      {imageUrl ? (
        <div className="aspect-square w-full overflow-hidden md:h-64">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square w-full flex items-center justify-center bg-secondary-background md:h-64">
          <span className="text-black text-lg md:text-4xl font-bold">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Text area at bottom */}
      <div className="px-4 py-6 text-center border-t-2 border-border">
        <h3 className="text-sm font-semibold leading-tight md:text-lg text-black">
          {title}
        </h3>
      </div>
    </div>
  );
}

export { ComparisonCard };