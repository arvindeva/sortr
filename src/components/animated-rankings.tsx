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
            ease: "easeOut"
          }}
          className={`bg-card flex items-center gap-4 rounded-lg border-2 p-4 ${
            index === 0
              ? "border-yellow-500"
              : index === 1
                ? "border-gray-400"
                : index === 2
                  ? "border-amber-600"
                  : "border-border"
          }`}
        >
          {/* Rank */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
              index === 0
                ? "border-4 border-yellow-500 bg-yellow-50 text-yellow-700"
                : index === 1
                  ? "border-4 border-gray-400 bg-gray-50 text-gray-700"
                  : index === 2
                    ? "border-4 border-amber-600 bg-amber-50 text-amber-700"
                    : "border border-gray-400 bg-gray-200 text-black"
            }`}
          >
            {index + 1}
          </div>

          {/* Image */}
          {item.imageUrl ? (
            <div
              className={`bg-muted h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-4 ${
                index === 0
                  ? "border-yellow-500"
                  : index === 1
                    ? "border-gray-400"
                    : index === 2
                      ? "border-amber-600"
                      : "border-transparent"
              }`}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-4 bg-gray-100 ${
                index === 0
                  ? "border-yellow-500"
                  : index === 1
                    ? "border-gray-400"
                    : index === 2
                      ? "border-amber-600"
                      : "border-transparent"
              }`}
            >
              <span className="text-muted-foreground text-sm font-bold">
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