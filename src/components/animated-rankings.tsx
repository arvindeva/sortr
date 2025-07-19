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
          className={`bg-main text-main-foreground rounded-base border-border shadow-shadow flex items-center gap-4 border-2 p-4`}
        >
          {/* Rank */}
          <span className="text-lg font-bold">{index + 1}.</span>

          {/* Image */}
          {item.imageUrl ? (
            <div className="rounded-base border-border h-16 w-16 flex-shrink-0 overflow-hidden border-2">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-base border-border bg-secondary-background flex h-16 w-16 flex-shrink-0 items-center justify-center border-2">
              <span className="text-foreground text-sm font-bold">
                {item.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Title */}
          <div className="flex-1">
            <h3 className="font-medium">{item.title}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
