import { notFound } from "next/navigation";
import { db } from "@/db";
import { sorters, sorterItems, sortingResults, user } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingItem, RankingItemContent } from "@/components/ui/ranking-item";
import { Play, User, Calendar, Eye, Trophy } from "lucide-react";

interface SorterPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface SorterItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface SorterGroup {
  id: string;
  name: string;
  items: SorterItem[];
}

interface Sorter {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  useGroups: boolean;
  userId: string;
  createdAt: string;
  completionCount: number;
  viewCount: number;
  user: {
    username: string;
  };
}

interface SorterData {
  sorter: Sorter;
  items: SorterItem[];
  groups: SorterGroup[];
}

async function getSorterWithItems(
  sorterSlug: string,
): Promise<SorterData | null> {
  // First get the sorter ID from slug for the view count update
  const sorterIdQuery = await db
    .select({ id: sorters.id })
    .from(sorters)
    .where(eq(sorters.slug, sorterSlug))
    .limit(1);

  if (sorterIdQuery.length === 0) {
    return null;
  }

  // Increment view count
  await db
    .update(sorters)
    .set({ viewCount: sql`${sorters.viewCount} + 1` })
    .where(eq(sorters.id, sorterIdQuery[0].id));

  // Use the API endpoint to get sorter data with groups support
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sorters/${sorterSlug}`,
  );
  if (!response.ok) {
    return null;
  }

  const data: SorterData = await response.json();
  return data;
}

async function getRecentResults(sorterId: string) {
  const recentResults = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      createdAt: sortingResults.createdAt,
      username: user.username,
    })
    .from(sortingResults)
    .leftJoin(user, eq(sortingResults.userId, user.id))
    .where(eq(sortingResults.sorterId, sorterId))
    .orderBy(desc(sortingResults.createdAt))
    .limit(10);

  return recentResults.map((result) => {
    let rankings = [];
    try {
      rankings = JSON.parse(result.rankings);
    } catch (error) {
      console.error("Failed to parse rankings:", error);
    }

    return {
      id: result.id,
      username: result.username || "Anonymous",
      top3: rankings.slice(0, 3),
      createdAt: result.createdAt,
    };
  });
}

export default async function SorterPage({ params }: SorterPageProps) {
  const { slug } = await params;
  const data = await getSorterWithItems(slug);

  if (!data) {
    notFound();
  }

  const { sorter, items, groups } = data;
  const recentResults = await getRecentResults(sorter.id);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Sorter Header */}
      <section>
        <Box variant="primary" size="md" className="mb-6 block">
          <div>
            <h1 className="text-xl font-bold">{sorter.title}</h1>
          </div>
        </Box>

        {/* Creator and Stats Info */}
        <Box variant="secondary" size="md" className="mb-6 block">
          <div className="space-y-3">
            {sorter.description && (
              <p className="text-md font-medium">{sorter.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
              <div className="flex items-center gap-1">
              <User size={16} />
              <span>by</span>
              {sorter.user.username ? (
                <Link
                  href={`/user/${sorter.user.username}`}
                  className="font-bold hover:underline"
                >
                  {sorter.user.username}
                </Link>
              ) : (
                <span className="font-bold">Unknown User</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{new Date(sorter.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span>{sorter.viewCount} views</span>
            </div>

            <div className="flex items-center gap-1">
              <Trophy size={16} />
              <span>{sorter.completionCount} completions</span>
            </div>
            </div>
          </div>
        </Box>

        {/* Start Now Button */}
        <div className="block">
          {sorter.useGroups ? (
            <Button asChild size="lg" variant="default" className="group mb-8">
              <Link href={`/sorter/${sorter.slug}/filters`}>
                <Play
                  className="mr-2 transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort Now
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="default" className="group mb-8">
              <Link href={`/sorter/${sorter.slug}/sort`}>
                <Play
                  className="mr-2 transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort now
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Items to Rank */}
        <section>
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Items to Rank ({items?.length || 0})</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-3 md:p-6">
              {sorter.useGroups && groups ? (
                /* Groups Mode */
                groups.length === 0 ? (
                  <Box variant="warning" size="md">
                    <p className="font-medium italic">
                      No groups found for this sorter.
                    </p>
                  </Box>
                ) : (
                  <div className="space-y-6">
                    {groups.map((group) => (
                      <div key={group.id} className="space-y-3">
                        {/* Group Header */}
                        <Badge variant="default" className="text-base">
                          {group.name}
                        </Badge>

                        {/* Items in Group */}
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <RankingItem
                              key={item.id}
                              className="bg-background text-foreground"
                            >
                              <RankingItemContent>
                                <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                                  {/* Thumbnail */}
                                  {item.imageUrl ? (
                                    <div className="border-border rounded-base h-10 w-10 flex-shrink-0 overflow-hidden border-2">
                                      <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="border-border bg-secondary-background rounded-base flex h-10 w-10 flex-shrink-0 items-center justify-center border-2">
                                      <span className="text-main text-xs font-bold">
                                        {item.title.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}

                                  {/* Title */}
                                  <div className="w-0 min-w-0 flex-1">
                                    <p className="text-sm font-medium break-words hyphens-auto">
                                      {item.title}
                                    </p>
                                  </div>
                                </div>
                              </RankingItemContent>
                            </RankingItem>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : /* Traditional Mode */
              items?.length === 0 ? (
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
                            <div className="border-border rounded-base h-10 w-10 flex-shrink-0 overflow-hidden border-2">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="border-border bg-secondary-background rounded-base flex h-10 w-10 flex-shrink-0 items-center justify-center border-2">
                              <span className="text-main text-xs font-bold">
                                {item.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {/* Item Name */}
                          <div className="w-0 min-w-0 flex-1">
                            <p className="text-sm font-medium break-words hyphens-auto">
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

        {/* Right Column - Recent Results */}
        <section>
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Recent Results ({recentResults.length})</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-3 md:p-6">
              {recentResults.length === 0 ? (
                <Box variant="warning" size="md">
                  <p className="font-medium italic">
                    No results yet. Be the first to complete this sorter!
                  </p>
                </Box>
              ) : (
                <div className="space-y-4">
                  {recentResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/results/${result.id}`}
                      className="block"
                    >
                      <Card className="bg-background text-foreground cursor-pointer">
                        <CardHeader>
                          {/* Username and Date */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">
                              {result.username}
                            </span>
                            <span className="text-foreground text-xs font-medium">
                              {new Date(result.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {/* Top 3 Results */}
                          <div className="space-y-2">
                            {result.top3.map((item: any, index: number) => (
                              <div
                                key={item.id || index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="text-sm font-bold">
                                  {index + 1}.
                                </span>
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {item.imageUrl ? (
                                    <div className="border-border rounded-base h-6 w-6 flex-shrink-0 overflow-hidden border-2">
                                      <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="border-border bg-secondary-background rounded-base flex h-6 w-6 flex-shrink-0 items-center justify-center border-2">
                                      <span className="text-main text-xs font-bold">
                                        {item.title.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="font-medium break-words">
                                    {item.title}
                                  </span>
                                </div>
                              </div>
                            ))}
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
    </main>
  );
}
