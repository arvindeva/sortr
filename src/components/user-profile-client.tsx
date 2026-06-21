"use client";

import { useUserProfile } from "@/hooks/api";
import { UserProfileContentSkeleton } from "@/components/skeletons/user-profile-content-skeleton";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { getImageUrl } from "@/lib/image-utils";

interface UserProfileClientProps {
  username: string;
  isOwnProfile: boolean;
  currentUserEmail?: string;
  initialData?: any; // Will use the same type as useUserProfile returns
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
      <section className="mb-8">
        <SectionHeading as="h2">Sorters ({sorters.length})</SectionHeading>
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
        <SectionHeading as="h2">Rankings ({rankings.length})</SectionHeading>
        <div>
          {rankings.length === 0 ? (
            <EmptyState
              title="No rankings yet."
              description="Complete some sorting sessions to see rankings!"
            />
          ) : (
            <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-2">
              {rankings.map((result) => (
                <Link
                  key={result.id}
                  href={`/rankings/${result.id}`}
                  prefetch={false}
                  className="card-link"
                >
                  <Card className="card h-full cursor-pointer gap-2">
                    <CardHeader className="flex flex-col justify-start">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 leading-relaxed">
                          {result.sorterTitle}
                        </CardTitle>
                        {result.sorterCategory && (
                          <Badge variant="default" className="shrink-0">
                            {result.sorterCategory}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Top 3 Rankings Preview */}
                      <div className="mb-3 space-y-2">
                        {result.top3.map((item: any, index: number) => (
                          <div
                            key={item.id || index}
                            className="flex items-center gap-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {item.imageUrl ? (
                                <div className="border-border rounded-base h-6 w-6 flex-shrink-0 overflow-hidden border shadow-sm">
                                  <img
                                    src={getImageUrl(
                                      item.imageUrl,
                                      "thumbnail",
                                    )}
                                    alt={item.title}
                                    className="h-full w-full object-contain"
                                    onError={(e) => {
                                      // Fallback to full-size image if thumbnail fails to load
                                      const target =
                                        e.target as HTMLImageElement;
                                      if (target.src.includes("-thumb")) {
                                        target.src = getImageUrl(
                                          item.imageUrl,
                                          "full",
                                        );
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="border-border rounded-base flex h-6 w-6 flex-shrink-0 items-center justify-center border bg-gradient-to-br from-muted to-secondary">
                                  <span className="text-muted-foreground/40 text-xs font-semibold">
                                    {item.title.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="min-w-[1.5rem] text-center font-bold">
                                {index + 1}.
                              </span>
                              <span className="font-medium break-words">
                                {item.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Date */}
                      <div className="text-foreground text-xs font-medium">
                        {new Date(result.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
