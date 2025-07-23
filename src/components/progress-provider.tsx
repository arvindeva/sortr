"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ProgressProvider() {
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  // Complete progress when pathname changes (page loads)
  useEffect(() => {
    if (progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const link = target.closest("a");

      if (link && link.href && link.href !== window.location.href) {
        // Don't show progress for download links
        if (link.download || link.href.startsWith('blob:') || link.href.startsWith('data:')) {
          return;
        }

        // Don't show progress for links that open in new tabs
        if (
          link.target === "_blank" ||
          link.target === "_top" ||
          link.target === "_parent"
        ) {
          return;
        }

        // Don't show progress for new tab keyboard shortcuts
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
          return;
        }

        setProgress(10);

        // Quick progress animation
        const timer = setTimeout(() => {
          setProgress(70);
        }, 100);

        return () => clearTimeout(timer);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-50">
      <div className="bg-muted h-1">
        <div
          className="bg-primary h-full transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
