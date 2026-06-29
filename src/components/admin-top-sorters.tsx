"use client";

import { useState } from "react";
import type { AdminStats } from "@/lib/admin-stats";

type Timeframe = "day" | "week" | "month" | "all";

const OPTIONS: { key: Timeframe; label: string }[] = [
  { key: "day", label: "24h" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All time" },
];

export function TopSortersCard({
  topSorters,
}: {
  topSorters: AdminStats["topSorters"];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const rows = topSorters[timeframe];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="hud text-xs text-muted-foreground">
          Top sorters by plays
        </div>
        {/* Timeframe segmented control */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setTimeframe(o.key)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                timeframe === o.key
                  ? "bg-main text-main-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center font-mono text-sm text-muted-foreground">
          No plays in this window yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((s, i) => (
            <li
              key={s.slug}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3.5 py-2.5"
            >
              <span className="display w-7 shrink-0 text-center text-lg font-black text-muted-foreground">
                {i + 1}
              </span>
              <a
                href={`/sorter/${s.slug}`}
                className="min-w-0 flex-1 truncate font-semibold text-foreground hover:text-main-ink"
              >
                {s.title}
              </a>
              <span className="shrink-0 font-mono text-[13px] text-cyan-ink">
                {s.plays.toLocaleString()} plays
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
