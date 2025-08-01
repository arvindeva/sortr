"use client";

import { motion } from "framer-motion";
import { getImageUrl } from "@/lib/image-utils";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
  groupImageUrl?: string;
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
          className={`bg-background text-foreground rounded-base border-border shadow-shadow overflow-hidden border-2 p-2 md:p-4 ${
            index < 3 ? "flex flex-col items-center text-center md:flex-row md:items-center md:text-left" : "flex items-center gap-3"
          }`}
        >
          {index < 3 ? (
            // Top 3: Special layout with larger images
            <>
              {/* Image */}
              {item.imageUrl || item.groupImageUrl ? (
                <div 
                  className="rounded-base border-border flex-shrink-0 overflow-hidden border-2 mb-3 md:mb-0 md:mr-4"
                  style={{ width: "200px", height: "200px" }}
                >
                  <img
                    src={
                      item.imageUrl
                        ? getImageUrl(item.imageUrl, "full")
                        : getImageUrl(item.groupImageUrl, "full")
                    }
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div 
                  className="rounded-base border-border bg-secondary-background flex flex-shrink-0 items-center justify-center border-2 mb-3 md:mb-0 md:mr-4"
                  style={{ width: "200px", height: "200px" }}
                >
                  <span className="text-main font-bold text-4xl md:text-5xl">
                    {item.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Title with Rank - Below image on mobile, beside on desktop */}
              <div className="relative min-w-0 flex-1">
                <h3 className="font-medium break-words md:text-xl">
                  {index + 1}.&nbsp;&nbsp;{item.title}
                </h3>
                {index === 0 && (
                  <span className="block mt-2 text-3xl md:absolute md:-top-1 md:right-2 md:mt-0 md:text-3xl">
                    🥇
                  </span>
                )}
                {index === 1 && (
                  <span className="block mt-2 text-3xl md:absolute md:-top-1 md:right-2 md:mt-0 md:text-3xl">
                    🥈
                  </span>
                )}
                {index === 2 && (
                  <span className="block mt-2 text-3xl md:absolute md:-top-1 md:right-2 md:mt-0 md:text-3xl">
                    🥉
                  </span>
                )}
              </div>
            </>
          ) : (
            // Rest: Standard horizontal layout
            <>
              {/* Image */}
              {item.imageUrl || item.groupImageUrl ? (
                <div className="rounded-base border-border h-10 w-10 flex-shrink-0 overflow-hidden border-2 md:h-16 md:w-16">
                  <img
                    src={
                      item.imageUrl
                        ? getImageUrl(item.imageUrl, "thumbnail")
                        : getImageUrl(item.groupImageUrl, "full")
                    }
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
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}
