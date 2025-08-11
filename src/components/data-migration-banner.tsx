"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataMigrationBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem("migration-banner-dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("migration-banner-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full bg-red-100 border-b-2 border-red-500 shadow-[0px_2px_0px_0px_#ef4444] dark:bg-red-950 dark:border-red-400 dark:shadow-[0px_2px_0px_0px_#f87171]">
      <div className="w-full px-3 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-sm text-red-800 dark:text-red-200 font-medium">
              <strong>Data Migration Notice:</strong> Due to a database migration issue on August 11th, all existing sorters were unfortunately lost. 
              We sincerely apologize for this inconvenience and any lost work. We've implemented additional safeguards to prevent this from happening again. 
              Please feel free to recreate any sorters you'd like to continue using.{" "}
              <button 
                onClick={handleDismiss}
                className="underline font-bold hover:no-underline transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
          <Button
            variant="noShadow"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 bg-red-200 hover:bg-red-300 text-red-800 border-red-500 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200 dark:border-red-400"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}