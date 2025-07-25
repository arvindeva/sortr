import React from "react";

interface SorterGridProps {
  children: React.ReactNode;
  minCardWidth?: number;
  gap?: string;
  className?: string;
}

export function SorterGrid({ 
  children, 
  minCardWidth = 200, 
  gap = "1rem",
  className = "" 
}: SorterGridProps) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
    gap: gap,
    justifyContent: "center",
  };

  return (
    <div 
      style={gridStyle}
      className={className}
    >
      {children}
    </div>
  );
}