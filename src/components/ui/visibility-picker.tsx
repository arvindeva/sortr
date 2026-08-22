"use client";

import { VISIBILITIES, type SorterVisibility } from "@/lib/sorter-visibility";

const COPY: Record<SorterVisibility, { label: string; hint: string }> = {
  public: { label: "Public", hint: "Shows in browse and search" },
  unlisted: { label: "Unlisted", hint: "Only people with the link" },
  private: { label: "Private", hint: "Only you" },
};

export function VisibilityPicker({
  value,
  onChange,
}: {
  value: SorterVisibility;
  onChange: (v: SorterVisibility) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Sorter visibility" className="flex flex-wrap gap-2">
      {VISIBILITIES.map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              active
                ? "border-main/60 bg-main/10"
                : "border-border bg-card hover:border-main/40"
            }`}
          >
            <span className={`hud block text-xs ${active ? "text-main-ink" : "text-foreground"}`}>
              {COPY[v].label}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {COPY[v].hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
