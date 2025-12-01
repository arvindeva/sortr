"use client";

import { useSorterPage, type SorterData } from "@/hooks/api/use-sorter";
import { SorterContentSkeleton } from "@/components/skeletons/sorter-content-skeleton";
import Link from "next/link";
import { Box } from "@/components/ui/box";
import { Badge } from "@/components/ui/badge";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RankingItem, RankingItemContent } from "@/components/ui/ranking-item";
import { getImageUrl } from "@/lib/image-utils";

interface SorterPageClientProps {
  slug: string;
  isOwner: boolean;
  currentUserEmail?: string;
  initialData?: SorterData;
}

export function SorterPageClient({
  slug,
  isOwner,
  currentUserEmail,
  initialData,
}: SorterPageClientProps) {
  const { sorterData, recentResults, isLoading, isError, error } =
    useSorterPage(slug, initialData, Date.now());

  if (isLoading) {
    return <SorterContentSkeleton />;
  }

  if (isError) {
    return (
      <section className="mb-8">
        <Box variant="warning" size="md">
          <p className="font-medium">
            {error?.message === "Sorter not found"
              ? "Sorter not found. This sorter may not exist or has been deleted."
              : "Failed to load sorter. Please try again."}
          </p>
        </Box>
      </section>
    );
  }

  if (!sorterData) {
    return <SorterContentSkeleton />;
  }

  const { items, tags } = sorterData;

  return (
    <>
      {/* Two Column Layout */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Items to Rank */}
        <section>
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Items to Rank ({items?.length || 0})</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              {items?.length === 0 ? (
                <Box variant="warning" size="md">
                  <p className="font-medium italic">
                    No items found for this sorter.
                  </p>
                </Box>
              ) : (
                <div className="space-y-3">
                  {items?.map((item) => (
                    <RankingItem
                      key={item.id}
                      className="bg-background text-foreground"
                    >
                      <RankingItemContent>
                        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                          {/* Thumbnail */}
                          {item.imageUrl ? (
                            <div className="border-border rounded-base bg-secondary-background h-16 w-16 flex-shrink-0 overflow-hidden border-2">
                              <img
                                src={getImageUrl(item.imageUrl, "thumbnail")}
                                alt={item.title}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  // Fallback to full-size image if thumbnail fails to load
                                  const target = e.target as HTMLImageElement;
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
                            <div className="border-border bg-secondary-background rounded-base flex h-16 w-16 flex-shrink-0 items-center justify-center border-2">
                              <span className="text-main text-xl font-bold">
                                {item.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {/* Item Name */}
                          <div className="w-0 min-w-0 flex-1">
                            <p className="font-medium break-words hyphens-auto">
                              {item.title}
                            </p>
                          </div>
                        </div>
                      </RankingItemContent>
                    </RankingItem>
                  ))}
                </div>
              )}
            </PanelContent>
          </Panel>
        </section>

        {/* Right Column */}
        <section className="space-y-8">
          {/* Filters Panel - Only show if tags exist */}
          {tags && tags.length > 0 && (
            <Panel variant="primary">
              <PanelHeader variant="primary">
                <PanelTitle>Filters</PanelTitle>
              </PanelHeader>
              <PanelContent variant="primary" className="p-2 md:p-6">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.id} variant="neutral">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </PanelContent>
            </Panel>
          )}

          {/* Recent Rankings Panel */}
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Recent Rankings ({recentResults.length})</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              {recentResults.length === 0 ? (
                <Box variant="warning" size="md">
                  <p className="text-base font-medium italic">
                    No rankings yet. Be the first to complete this sorter!
                  </p>
                </Box>
              ) : (
                <div className="space-y-4">
                  {recentResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/rankings/${result.id}`}
                      prefetch={false}
                      className="card-link block"
                    >
                      <Card className="bg-background text-foreground card cursor-pointer gap-2">
                        <CardHeader>
                          {/* Username only */}
                          <span
                            className={`font-bold ${
                              result.username === "Anonymous"
                                ? "text-gray-600 dark:text-gray-400"
                                : ""
                            }`}
                          >
                            {result.username}
                          </span>
                        </CardHeader>
                        <CardContent>
                          {/* Top 3 Rankings */}
                          <div className="mb-3 space-y-2">
                            {result.top3.map((item: any, index: number) => (
                              <div
                                key={item.id || index}
                                className="flex items-center gap-2"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {item.imageUrl ? (
                                    <div className="border-border rounded-base bg-secondary-background h-6 w-6 flex-shrink-0 overflow-hidden border-2">
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
                                    <div className="border-border bg-secondary-background rounded-base flex h-6 w-6 flex-shrink-0 items-center justify-center border-2">
                                      <span className="text-main text-xs font-bold">
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
                          {/* Date moved below items */}
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
            </PanelContent>
          </Panel>
        </section>
      </div>
    </>
  );
}
