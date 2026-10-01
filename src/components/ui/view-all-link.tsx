import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Section-header "VIEW ALL" link: display face, uppercase, with an arrow that
 * slides on hover. Focus ring takes the section's team color (--team, set by
 * teamColorStyle) and falls back to magenta outside team-colored sections.
 */
export function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group/va font-heading text-foreground inline-flex shrink-0 items-center gap-[0.35rem] text-[19px] font-extrabold tracking-[0.04em] whitespace-nowrap uppercase focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--team,var(--main))]"
    >
      view all
      <ArrowRight
        aria-hidden
        size={16}
        strokeWidth={2.5}
        className="transition-transform duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/va:translate-x-1"
      />
    </Link>
  );
}
