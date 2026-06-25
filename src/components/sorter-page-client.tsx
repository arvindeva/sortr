"use client";

import { useSorterPage, type SorterData } from "@/hooks/api/use-sorter";
import { SorterContentSkeleton } from "@/components/skeletons/sorter-content-skeleton";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CoverTile } from "@/components/ui/cover-tile";
import { accentFor } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";

interface SorterPageClientProps {
  slug: string;
  isOwner: boolean;
  currentUserEmail?: string;
  initialData?: SorterData;
}

// Small display-font section title with a colored arrow + optional count.
function SectionTitle({
  children,
  count,
  arrowClass = "text-main",
}: {
  children: React.ReactNode;
  count?: number;
  arrowClass?: string;
}) {
  return (
    <h2 className="display mb-4 text-[30px] font-black text-foreground">
      {children}
      {count != null && (
        <span className="font-bold text-muted-foreground"> ({count})</span>
      )}{" "}
      <span className={arrowClass}>▸</span>
    </h2>
  );
}

export function SorterPageClient({
  slug,
  initialData,
}: SorterPageClientProps) {
  const { sorterData, recentResults, isLoading, isError, error } =
    useSorterPage(slug, initialData, Date.now());

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

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-start">
      {/* Left — Items to rank */}
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

      {/* Right — Recent rankings */}
      <section>
        <SectionTitle count={recentResults.length} arrowClass="text-cyan-ink">
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                    {result.top3.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex min-w-0 flex-1 items-center gap-2"
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
  );
}
