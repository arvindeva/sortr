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

export function AnimatedRankings({ rankings }: AnimatedRankingsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {rankings.map((item, index) => {
        const isTop3 = index < 3;
        const numColor = isTop3 ? MEDAL_VARS[index] : "var(--muted-foreground)";
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
              borderColor: isTop3 ? MEDAL_ROW_BORDER[index] : "var(--border)",
              boxShadow: isTop3 ? MEDAL_GLOW[index] : undefined,
            }}
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
          </motion.div>
        );
      })}
    </div>
  );
}
