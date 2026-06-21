import { cn } from "@/lib/utils";

interface SortrMarkProps {
  /** Pixel size of the square mark. Defaults to 24. */
  size?: number;
  className?: string;
  /** When true, the two squares lean toward each other (used on hover). */
  animate?: boolean;
}

/**
 * The sortr brand mark: two squares facing off — the duel at the heart
 * of the app. Left square is the "winner" (filled), right is the
 * "contender" (outlined). Built from divs so it inherits theme colors
 * and animates cheaply.
 */
export function SortrMark({
  size = 24,
  className,
  animate = false,
}: SortrMarkProps) {
  // Gap and square size derive from the overall size so it scales cleanly.
  const square = Math.round(size * 0.42);
  const radius = Math.max(2, Math.round(size * 0.16));

  return (
    <span
      aria-hidden
      className={cn("relative inline-flex items-center", className)}
      style={{ width: size, height: square, gap: Math.round(size * 0.14) }}
    >
      {/* Winner — filled */}
      <span
        className={cn(
          "block bg-main transition-transform duration-300 ease-out",
          animate && "group-hover:translate-x-[1px] group-hover:-rotate-6",
        )}
        style={{ width: square, height: square, borderRadius: radius }}
      />
      {/* Contender — outlined */}
      <span
        className={cn(
          "block border-2 border-main/40 transition-transform duration-300 ease-out",
          animate && "group-hover:-translate-x-[1px] group-hover:rotate-6",
        )}
        style={{ width: square, height: square, borderRadius: radius }}
      />
    </span>
  );
}
