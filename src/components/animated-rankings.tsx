"use client";

import { motion } from "framer-motion";

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
          className={`bg-background text-foreground rounded-base border-border shadow-shadow flex items-center gap-3 overflow-hidden border-2 p-2 md:p-4`}
        >
          {/* Image */}
          {item.imageUrl ? (
            <div className="rounded-base border-border h-10 w-10 flex-shrink-0 overflow-hidden border-2 md:h-16 md:w-16">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
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
            {index === 0 && (
              <span className="absolute -top-1 right-2 text-2xl md:text-3xl">
                🥇
              </span>
            )}
            {index === 1 && (
              <span className="absolute -top-1 right-2 text-2xl md:text-3xl">
                🥈
              </span>
            )}
            {index === 2 && (
              <span className="absolute -top-1 right-2 text-2xl md:text-3xl">
                🥉
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
