"use client";

import { SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Theme toggle. `variant="icon"` (default) is the bordered sun/moon button;
 * `variant="bare"` is the same icon with no button chrome, turning magenta on
 * hover.
 */
export function ModeToggle({ variant = "icon" }: { variant?: "icon" | "bare" }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Use resolvedTheme (the actually-applied light/dark) rather than `theme`,
  // which can be "system" and make the first toggle a no-op.
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (variant === "bare") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="text-foreground hover:text-main-ink focus-visible:ring-ring grid size-[42px] place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <SunMoon aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <Button
      variant="neutral"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <SunMoon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
