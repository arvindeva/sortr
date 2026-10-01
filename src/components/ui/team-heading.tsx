import { cn } from "@/lib/utils";

/**
 * Team-colored section heading: the title sits in a tilted block of the
 * section's accent (--team, set by teamColorStyle on an ancestor) with
 * midnight text. The block is an inline span with box-decoration-break:
 * clone, so when a long title wraps on a narrow screen each line gets its own
 * block hugging its text, instead of one block stretched to the full width.
 *
 * size "lg" = homepage section headings (30 → 42px); "md" = column headings
 * on sorter pages (30px).
 */
export function TeamHeading({
  children,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  size?: "lg" | "md";
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "display min-w-0 -rotate-[1.5deg] leading-[1.18] font-black",
        size === "lg" ? "text-3xl md:text-[42px]" : "text-[30px]",
        className,
      )}
    >
      <span className="bg-(--team) box-decoration-clone rounded-md px-[0.18em] pt-[0.06em] pb-[0.01em] text-[#0b0918]">
        {children}
      </span>
    </h2>
  );
}
