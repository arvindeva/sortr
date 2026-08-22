"use client";

import { useState } from "react";
import { CoverTile } from "@/components/ui/cover-tile";
import { InfoPopover } from "@/components/ui/info-popover";
import type { CommunityRankingPayload } from "@/lib/community-ranking-data";

// Glow + border for the top-3 podium tiles (gold / silver / bronze).
const MEDAL_GLOW = [
  "0 0 28px rgba(255,210,63,.32)",
  "0 0 24px rgba(205,214,232,.28)",
  "0 0 24px rgba(214,138,78,.3)",
];
const MEDAL_BORDER = [
  "rgba(255,210,63,.65)",
  "rgba(205,214,232,.55)",
  "rgba(214,138,78,.6)",
];
// Badge fill + ink, matching the share image's medal badges.
const MEDAL_BADGE = ["#ffd23f", "#cdd6e8", "#d68a4e"];

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
          Counts rankings from{" "}
          <span className="text-foreground">every version</span> of this
          sorter, matched onto its current items. Rankings that no longer
          match enough of the current items (after a big edit) are left out,
          and each signed-in player counts once — only their latest ranking
          is used.
        </InfoPopover>
      </div>
      <div className="mt-1.5 mb-5 font-mono text-xs tracking-wide text-muted-foreground">
        aggregated from {totalRankings.toLocaleString()} ranking
        {totalRankings === 1 ? "" : "s"}
      </div>

      {/* Top 3 — podium row of square tiles (cover fills, title on scrim). */}
      {visible.length > 0 && (
        <ol className="mb-2.5 grid grid-cols-3 gap-2.5">
          {visible.slice(0, 3).map((row, i) => (
            <li
              key={row.itemId}
              className="relative aspect-square overflow-hidden rounded-[12px] border-2"
              style={{
                borderColor: MEDAL_BORDER[i],
                boxShadow: MEDAL_GLOW[i],
              }}
            >
              <CoverTile
                imageUrl={row.imageUrl}
                name={row.title}
                colorKey={row.itemId}
                hideName
                radius={0}
                className="absolute inset-0"
              />
              {/* Rank badge */}
              <span
                className="display absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-[7px] px-1 text-[15px] font-black"
                style={{ background: MEDAL_BADGE[i], color: "rgba(0,0,0,.8)" }}
              >
                {i + 1}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-5">
                <span className="display line-clamp-2 text-[12px] leading-tight font-bold text-white normal-case">
                  {row.title}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* 4th place down — the compact list. */}
      <ol className="flex flex-col gap-2.5">
        {visible.slice(3).map((row, idx) => {
          const i = idx + 3;
          return (
            <li
              key={row.itemId}
              className="flex items-center gap-3.5 rounded-[11px] border border-border bg-card px-3.5 py-2.5"
            >
              <span
                className="display w-7 shrink-0 text-center text-[26px] font-black"
                style={{ color: "var(--muted-foreground)" }}
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
