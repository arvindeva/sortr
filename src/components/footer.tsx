import { Wordmark } from "@/components/ui/sortr-mark";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-7 sm:flex-row">
        <Wordmark size={22} withPeriod />
        <p className="font-mono text-xs text-muted-foreground">
          create a sorter for anything · © 2026
        </p>
      </div>
    </footer>
  );
}
