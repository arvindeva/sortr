"use client";

import * as React from "react";
import { SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Use resolvedTheme (the actually-applied light/dark) rather than `theme`,
  // which can be "system" and make the first toggle a no-op.
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

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
