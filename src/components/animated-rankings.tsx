"use client";

import { motion } from "framer-motion";
import { getImageUrl } from "@/lib/image-utils";
import { accentFor } from "@/lib/utils";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface AnimatedRankingsProps {
  rankings: RankedItem[];
}

const MEDAL_VARS = [
  "var(--medal-gold)",
  "var(--medal-silver)",
  "var(--medal-bronze)",
];

export function AnimatedRankings({ rankings }: AnimatedRankingsProps) {
  const total = rankings.length;

  return (
    <div className="flex flex-col gap-2.5">
      {rankings.map((item, index) => {
        const isTop3 = index < 3;
        const numColor = isTop3 ? MEDAL_VARS[index] : "var(--muted-foreground)";
        const accent = accentFor(item.id || index);
        // A gentle descending bar: #1 full, tapering toward the bottom.
        const barPct = Math.round(((total - index) / total) * 100);

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
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 md:gap-4 md:px-4.5 md:py-3.5"
          >
            {/* Rank numeral */}
            <span
              className="display w-9 shrink-0 text-center text-2xl font-black md:text-[34px]"
              style={{ color: numColor }}
            >
              {index + 1}
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

            {/* Score bar + medal badge (desktop) */}
            <div className="ml-auto hidden items-center gap-4 sm:flex">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-foreground/[0.08] md:w-40">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, background: accent }}
                />
              </div>
              {isTop3 && (
                <span
                  className="display flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[17px] font-black"
                  style={{ background: MEDAL_VARS[index], color: "rgba(0,0,0,.75)" }}
                >
                  {index + 1}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
