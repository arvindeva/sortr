"use client";

import { motion } from "framer-motion";
import { getImageUrl } from "@/lib/image-utils";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface AnimatedRankingsProps {
  rankings: RankedItem[];
}

export function AnimatedRankings({ rankings }: AnimatedRankingsProps) {
  return (
    <div className="space-y-3">
      {rankings.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index < 10 ? index * 0.1 : 10 * 0.1,
            ease: "easeOut",
          }}
          className={
            "bg-background text-foreground rounded-base border-border shadow-shadow overflow-hidden border-2 p-1 md:p-3 flex items-center gap-3"
          }
        >
          {/* Image (uniform size for all ranks) */}
          {item.imageUrl ? (
            <div className="rounded-base border-border bg-secondary-background h-10 w-10 flex-shrink-0 overflow-hidden border-2 md:h-16 md:w-16">
              <img
                src={getImageUrl(item.imageUrl, "thumbnail")}
                alt={item.title}
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes("-thumb")) {
                    target.src = getImageUrl(item.imageUrl, "full");
                  }
                }}
              />
            </div>
          ) : (
            <div className="rounded-base border-border bg-secondary-background flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 md:h-16 md:w-16">
              <span className="text-main font-bold">
                {item.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Title with Rank */}
          <div className="relative min-w-0 flex-1">
            <h3 className="font-medium break-words md:text-base">
              {index + 1}.&nbsp;&nbsp;{item.title}
            </h3>
          </div>

          {/* Medal for top 3 only (kept, no layout change) */}
          {index === 0 && (
            <span className="text-2xl md:text-3xl" aria-label="Gold medal">
              🥇
            </span>
          )}
          {index === 1 && (
            <span className="text-2xl md:text-3xl" aria-label="Silver medal">
              🥈
            </span>
          )}
          {index === 2 && (
            <span className="text-2xl md:text-3xl" aria-label="Bronze medal">
              🥉
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
