"use client";

import { useQuery } from "@tanstack/react-query";
import { useSorterPage, type SorterData } from "@/hooks/api/use-sorter";
import { SorterContentSkeleton } from "@/components/skeletons/sorter-content-skeleton";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CoverTile } from "@/components/ui/cover-tile";
import { CommunityRanking } from "@/components/community-ranking";
import { CommunityRankingSkeleton } from "@/components/community-ranking-skeleton";
import { accentFor } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";
import type { CommunityRankingPayload } from "@/lib/community-ranking-data";

interface SorterPageClientProps {
  slug: string;
  isOwner: boolean;
  currentUserEmail?: string;
  initialData?: SorterData;
  /** Cheap server-side check — true if this sorter has enough rankings for a
   *  community ranking. Gates the heading + skeleton so they only show when one
   *  will actually appear (no misleading flash for sparse sorters). */
  hasCommunityRanking?: boolean;
}

// Small display-font section title with an optional count.
function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="display mb-4 text-[30px] font-black text-foreground">
      {children}
      {count != null && (
        <span className="font-bold text-muted-foreground"> ({count})</span>
      )}
    </h2>
  );
}

export function SorterPageClient({
  slug,
  initialData,
  hasCommunityRanking = false,
}: SorterPageClientProps) {
  const { sorterData, recentResults, isLoading, isError, error } =
    useSorterPage(slug, initialData, Date.now());

  // Fetched separately so its heavy aggregate never blocks the page render.
  const { data: communityRanking, isPending: communityPending } = useQuery<
    CommunityRankingPayload | null
  >({
    queryKey: ["community-ranking", slug],
    queryFn: async () => {
      const res = await fetch(`/api/sorters/${slug}/community-ranking`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !sorterData) {
    return <SorterContentSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        variant="error"
        title={
          error?.message === "Sorter not found"
            ? "Sorter not found."
            : "Failed to load sorter."
        }
        description="This sorter may not exist, or try again."
      />
    );
  }

  const { items } = sorterData;

  const itemsSection = (
    <section>
      <SectionTitle count={items?.length || 0}>Items to rank</SectionTitle>
      {items?.length === 0 ? (
        <EmptyState title="No items found for this sorter." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items?.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-3.5 py-3"
            >
              {item.imageUrl ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[7px] border border-border bg-muted">
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
                  className="h-10 w-10 shrink-0 rounded-[7px]"
                  style={{ background: accentFor(item.id || i) }}
                />
              )}
              <span className="min-w-0 font-semibold break-words text-foreground">
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    // Two independent columns on desktop so their unequal heights don't drag on
    // each other (a tall items list no longer pushes recent rankings down).
    // Left column: community + recent stacked. Right column: items.
    //
    // The left wrapper is `display:contents` on mobile, so community & recent
    // become direct flex children of the outer container alongside items — that
    // lets `order` interleave them as community → items → recent on mobile.
    // On desktop the wrapper becomes a real flex column again.
    <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-8">
      {/* Left column — community + recent */}
      <div className="contents md:flex md:min-w-0 md:flex-1 md:flex-col md:gap-8">
        {communityPending && hasCommunityRanking ? (
          <div className="order-1 md:order-none">
            <CommunityRankingSkeleton />
          </div>
        ) : (
          communityRanking && (
            <div className="order-1 md:order-none">
              <CommunityRanking data={communityRanking} />
            </div>
          )
        )}

        {/* Recent rankings */}
        <section className="order-3 md:order-none">
          <SectionTitle count={recentResults.length}>
            Recent rankings
          </SectionTitle>
        {recentResults.length === 0 ? (
          <EmptyState
            title="No rankings yet."
            description="Be the first to complete this sorter."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recentResults.map((result) => {
              const anon = result.username === "Anonymous";
              return (
                <Link
                  key={result.id}
                  href={`/rankings/${result.id}`}
                  prefetch={false}
                  className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-main/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${anon ? "text-muted-foreground" : "text-cyan-ink"}`}
                    >
                      {anon ? "Anonymous" : `@${result.username}`}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(result.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {result.top3.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <span
                          className="display w-[18px] text-lg font-black"
                          style={{
                            color:
                              index === 0
                                ? "var(--medal-gold)"
                                : index === 1
                                  ? "var(--medal-silver)"
                                  : "var(--medal-bronze)",
                          }}
                        >
                          {index + 1}
                        </span>
                        {item.imageUrl ? (
                          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-[6px] border border-border bg-muted">
                            <img
                              src={getImageUrl(item.imageUrl, "thumbnail")}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span
                            className="h-6 w-6 shrink-0 rounded-[6px]"
                            style={{ background: accentFor(item.id || index) }}
                          />
                        )}
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </section>
      </div>

      {/* Right column — items to rank. order-2 on mobile (between community and
          recent); its own independent column on desktop. */}
      <div className="order-2 min-w-0 md:order-none md:flex-1">
        {itemsSection}
      </div>
    </div>
  );
}
