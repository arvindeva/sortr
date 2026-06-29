"use client";

import { useState } from "react";
import { CoverTile } from "@/components/ui/cover-tile";
import { InfoPopover } from "@/components/ui/info-popover";
import type { CommunityRankingPayload } from "@/lib/community-ranking-data";

const MEDAL_VARS = [
  "var(--medal-gold)",
  "var(--medal-silver)",
  "var(--medal-bronze)",
];

// Glow + border for the top-3 rows (gold / silver / bronze).
const MEDAL_GLOW = [
  "0 0 28px rgba(255,210,63,.32)",
  "0 0 24px rgba(205,214,232,.28)",
  "0 0 24px rgba(214,138,78,.3)",
];
const MEDAL_ROW_BORDER = [
  "rgba(255,210,63,.5)",
  "rgba(205,214,232,.45)",
  "rgba(214,138,78,.48)",
];

const TOP_N = 10;

export function CommunityRanking({ data }: { data: CommunityRankingPayload }) {
  const [expanded, setExpanded] = useState(false);

  const { rows, totalRankings } = data;
  const visible = expanded ? rows : rows.slice(0, TOP_N);
  const hasMore = rows.length > TOP_N;

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="display text-[30px] font-black text-foreground">
          Community ranking
        </h2>
        <InfoPopover label="How the community ranking works">
          This ranking only counts results from the{" "}
          <span className="text-foreground">current version</span> of the
          sorter. If the creator edits it (adds or removes items), older results
          from previous versions are no longer included — so a freshly edited
          sorter may show fewer results until people rank the new version.
        </InfoPopover>
      </div>
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
              className="flex items-center gap-3.5 rounded-[11px] border bg-card px-3.5 py-2.5"
              style={{
                borderColor: isTop3 ? MEDAL_ROW_BORDER[i] : "var(--border)",
                boxShadow: isTop3 ? MEDAL_GLOW[i] : undefined,
              }}
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
    </section>
  );
}
