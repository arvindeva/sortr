"use client";

import { useState } from "react";
import { CoverTile } from "@/components/ui/cover-tile";
import type { CommunityRankingPayload } from "@/lib/community-ranking-data";

const MEDAL_VARS = [
  "var(--medal-gold)",
  "var(--medal-silver)",
  "var(--medal-bronze)",
];

const TOP_N = 10;

export function CommunityRanking({ data }: { data: CommunityRankingPayload }) {
  const [expanded, setExpanded] = useState(false);

  const { rows, totalRankings } = data;
  const visible = expanded ? rows : rows.slice(0, TOP_N);
  const hasMore = rows.length > TOP_N;

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        borderColor: "var(--panel-border)",
        background: "var(--panel)",
        boxShadow: "var(--panel-glow)",
      }}
    >
      <h2 className="display text-[30px] font-black text-foreground">
        Community ranking
      </h2>
      <div className="mt-1.5 mb-5 font-mono text-xs tracking-wide text-muted-foreground">
        aggregated from {totalRankings.toLocaleString()} ranking
        {totalRankings === 1 ? "" : "s"}
      </div>

      <ol className="flex flex-col gap-2.5">
        {visible.map((row, i) => {
          const isTop3 = i < 3;
          const numColor = isTop3
            ? MEDAL_VARS[i]
            : "var(--muted-foreground)";
          return (
            <li
              key={row.itemId}
              className="flex items-center gap-3.5 rounded-[11px] border border-border bg-card px-3.5 py-2.5"
            >
              <span
                className="display w-7 shrink-0 text-center text-[26px] font-black"
                style={{ color: numColor }}
              >
                {i + 1}
              </span>
              <CoverTile
                imageUrl={row.imageUrl}
                name={row.title}
                colorKey={row.itemId}
                nameSize={11}
                radius={7}
                className="h-[34px] w-[34px] shrink-0"
              />
              <span className="min-w-0 flex-1 truncate font-bold text-foreground">
                {row.title}
              </span>
              {isTop3 && (
                <span
                  className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black"
                  style={{
                    background: MEDAL_VARS[i],
                    color: "rgba(0,0,0,.75)",
                  }}
                >
                  {i + 1}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full rounded-[10px] border border-border py-2.5 font-mono text-[13px] text-muted-foreground transition-colors hover:border-main/40 hover:text-main-ink"
        >
          {expanded ? "Show less ▴" : `Show all ${rows.length} ▾`}
        </button>
      )}
    </div>
  );
}
