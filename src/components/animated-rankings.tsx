"use client";

import { motion } from "framer-motion";
import { getImageUrl } from "@/lib/image-utils";
import { accentFor } from "@/lib/utils";
import { computeCompetitionRanks } from "@/lib/ranking-utils";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
  /** Tied with the previous item (shared competition rank). */
  tiedWithPrev?: boolean;
}

interface AnimatedRankingsProps {
  rankings: RankedItem[];
}

// Medal styling keyed by RANK (1/2/3), not position: ties share medals per
// the Olympic rule (two golds → no silver), and a skipped rank skips its
// medal entirely.
const MEDAL_VARS: Record<number, string> = {
  1: "var(--medal-gold)",
  2: "var(--medal-silver)",
  3: "var(--medal-bronze)",
};
const MEDAL_GLOW: Record<number, string> = {
  1: "0 0 28px rgba(255,210,63,.32)",
  2: "0 0 24px rgba(205,214,232,.28)",
  3: "0 0 24px rgba(214,138,78,.3)",
};
const MEDAL_ROW_BORDER: Record<number, string> = {
  1: "rgba(255,210,63,.5)",
  2: "rgba(205,214,232,.45)",
  3: "rgba(214,138,78,.48)",
};

export function AnimatedRankings({ rankings }: AnimatedRankingsProps) {
  const ranks = computeCompetitionRanks(rankings);
  return (
    <div className="flex flex-col gap-2.5">
      {rankings.map((item, index) => {
        const rank = ranks[index];
        const isTop3 = rank <= 3;
        const numColor = MEDAL_VARS[rank] ?? "var(--muted-foreground)";
        const accent = accentFor(item.id || index);

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index < 10 ? index * 0.08 : 0.8,
              ease: "easeOut",
            }}
            className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 md:gap-4 md:px-4.5 md:py-3.5"
            style={{
              borderColor: isTop3 ? MEDAL_ROW_BORDER[rank] : "var(--border)",
              boxShadow: isTop3 ? MEDAL_GLOW[rank] : undefined,
            }}
          >
            {/* Rank numeral */}
            <span
              className="display w-9 shrink-0 text-center text-2xl font-black md:text-[34px]"
              style={{ color: numColor }}
            >
              {rank}
            </span>

            {/* Thumb — image or color tile */}
            {item.imageUrl ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted md:h-[46px] md:w-[46px]">
                <img
                  src={getImageUrl(item.imageUrl, "thumbnail")}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (t.src.includes("-thumb"))
                      t.src = getImageUrl(item.imageUrl, "full");
                  }}
                />
              </div>
            ) : (
              <span
                className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] md:h-[46px] md:w-[46px]"
                style={{ background: accent }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0 7px, transparent 7px 14px)",
                  }}
                />
              </span>
            )}

            {/* Name */}
            <span className="min-w-0 flex-1 font-bold break-words text-foreground md:text-[17px]">
              {item.title}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
