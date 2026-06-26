import Link from "next/link";
import { Wordmark } from "@/components/ui/sortr-mark";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border">
      <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 sm:flex-row md:px-6">
        <Wordmark size={22} withPeriod />
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/privacy"
            className="font-mono text-[13px] font-bold text-cyan-ink underline decoration-cyan-ink/40 underline-offset-4 transition-colors hover:text-main-ink hover:decoration-main-ink/50"
          >
            Privacy
          </Link>
          <span aria-hidden className="text-muted-foreground/40">
            |
          </span>
          <p className="font-mono text-[13px] text-muted-foreground">
            Rank anything ·{" "}
            <span className="inline-block text-[1.25em] leading-none align-[-0.18em]">
              ©
            </span>{" "}
            2026
          </p>
        </div>
      </div>
    </footer>
  );
}
