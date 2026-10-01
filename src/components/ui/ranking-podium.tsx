import { accentFor } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";
import { computeCompetitionRanks, medalForRank } from "@/lib/ranking-utils";

interface PodiumItem {
  id?: string;
  title: string;
  imageUrl?: string | null;
  /** Tied with the previous item (shared rank). */
  tiedWithPrev?: boolean;
}

/**
 * A ranking's top 3 as square image tiles — medal-colored rank badge
 * top-left, title over a black scrim (the SorterCard language). Used by the
 * ranking preview cards on sorter pages and profiles. Items without an image
 * fall back to their accent color; a missing thumbnail retries the full image.
 */
export function RankingPodium({ items }: { items: PodiumItem[] }) {
  const ranks = computeCompetitionRanks(items);
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, index) => {
        const rank = ranks[index];
        return (
          <div
            key={item.id || index}
            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            {item.imageUrl ? (
              <img
                src={getImageUrl(item.imageUrl, "thumbnail")}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  if (item.imageUrl && t.src.includes("-thumb"))
                    t.src = getImageUrl(item.imageUrl, "full");
                }}
              />
            ) : (
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ background: accentFor(item.id || index) }}
              />
            )}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-3/5"
              style={{
                background: "linear-gradient(180deg, transparent, rgba(0,0,0,.85))",
              }}
            />
            <span
              className="display absolute top-1.5 left-1.5 grid h-6 min-w-6 place-items-center rounded-[6px] px-1 text-[15px] font-black text-[#0b0918]"
              style={{ background: medalForRank(rank) ?? "var(--medal-bronze)" }}
            >
              {rank}
            </span>
            <span className="display absolute inset-x-1.5 bottom-1.5 line-clamp-2 text-[12px] leading-tight font-bold text-white normal-case sm:text-[13px]">
              {item.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
