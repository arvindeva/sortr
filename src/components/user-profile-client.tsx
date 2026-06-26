"use client";

import { useUserProfile } from "@/hooks/api";
import { UserProfileContentSkeleton } from "@/components/skeletons/user-profile-content-skeleton";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { accentFor } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";

interface UserProfileClientProps {
  username: string;
  isOwnProfile: boolean;
  currentUserEmail?: string;
  initialData?: any; // Will use the same type as useUserProfile returns
}

// Display-font section title with an optional count, matching the arcade
// section headings used across the app.
function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="display mb-4 text-[clamp(1.75rem,5vw,2.125rem)] font-black text-foreground">
      {children}
      {count != null && (
        <span className="font-bold text-muted-foreground"> ({count})</span>
      )}
    </h2>
  );
}

export function UserProfileClient({
  username,
  isOwnProfile,
  currentUserEmail,
  initialData,
}: UserProfileClientProps) {
  const { data, isLoading, error } = useUserProfile(username, initialData);

  if (isLoading) {
    return <UserProfileContentSkeleton />;
  }

  if (error) {
    return (
      <section className="mb-8">
        <EmptyState
          variant="error"
          title={
            error.message === "User not found"
              ? "User not found. This profile may not exist."
              : "Failed to load user profile. Please try again."
          }
        />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mb-8">
        <EmptyState variant="error" title="User not found." />
      </section>
    );
  }

  const { user, stats, sorters, rankings, userSince } = data;

  return (
    <>
      {/* Sorters Section */}
      <section className="mb-10">
        <SectionTitle count={sorters.length}>Sorters</SectionTitle>
        <div>
          {sorters.length === 0 ? (
            <EmptyState
              title="No sorters created yet."
              description="Start creating sorters to share with others!"
            />
          ) : (
            <SorterGrid>
              {sorters.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          )}
        </div>
      </section>

      {/* Rankings Section */}
      <section>
        <SectionTitle count={rankings.length}>
          Rankings
        </SectionTitle>
        <div>
          {rankings.length === 0 ? (
            <EmptyState
              title="No rankings yet."
              description="Complete some sorting sessions to see rankings!"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rankings.map((result) => (
                <Link
                  key={result.id}
                  href={`/rankings/${result.id}`}
                  prefetch={false}
                  className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-main/40 md:p-5"
                >
                  {/* Title + date (top-right, matching the sorter recent cards) */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="display text-[22px] leading-tight font-extrabold text-foreground">
                      {result.sorterTitle}
                    </h3>
                    <span className="mt-1 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {new Date(result.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Category chip */}
                  {result.sorterCategory && (
                    <span className="mb-3.5 inline-block rounded-full border border-main/40 bg-accent px-2.5 py-1 font-mono text-[11px] text-main-ink">
                      {result.sorterCategory}
                    </span>
                  )}

                  {/* Top 3 preview */}
                  <div className="flex flex-col gap-2.5">
                    {result.top3.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="display w-[22px] text-lg font-black"
                          style={{
                            color:
                              index === 0
                                ? "var(--medal-gold)"
                                : index === 1
                                  ? "var(--medal-silver)"
                                  : index === 2
                                    ? "var(--medal-bronze)"
                                    : "var(--muted-foreground)",
                          }}
                        >
                          {index + 1}
                        </span>
                        {item.imageUrl ? (
                          <div className="h-[26px] w-[26px] shrink-0 overflow-hidden rounded-[6px] border border-border bg-muted">
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
                            className="h-[26px] w-[26px] shrink-0 rounded-[6px]"
                            style={{ background: accentFor(item.id || index) }}
                          />
                        )}
                        <span className="min-w-0 font-medium break-words text-foreground">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
