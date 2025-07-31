import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, sorterItems, sortingResults, user } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { PageHeader } from "@/components/ui/page-header";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingItem, RankingItemContent } from "@/components/ui/ranking-item";
import { Play, User, Calendar, Eye, Trophy, Trash2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { DeleteSorterButton } from "@/components/delete-sorter-button";
import { getImageUrl } from "@/lib/image-utils";

// Force dynamic rendering for real-time view counts and recent results
export const dynamic = "force-dynamic";

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
  groupImageUrl?: string;
}

interface SorterGroup {
  id: string;
  name: string;
  coverImageUrl?: string;
  items: SorterItem[];
}

interface Sorter {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  useGroups: boolean;
  userId: string;
  createdAt: string;
  completionCount: number;
  viewCount: number;
  user: {
    username: string;
    id: string;
  };
}

interface SorterTag {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  items: SorterItem[];
}

interface SorterData {
  sorter: Sorter;
  items: SorterItem[];
  groups: SorterGroup[];
  tags?: SorterTag[];
}

export async function generateMetadata({
  params,
}: SorterPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Get sorter data for metadata (without incrementing view count)
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sorters/${slug}`,
  );
  if (!response.ok) {
    return {
      title: "Sorter Not Found | sortr",
      description: "The requested sorter could not be found.",
    };
  }

  const data: SorterData = await response.json();
  const { sorter, items, groups, tags } = data;

  // Create dynamic title
  const title = sorter.title;

  // Create description
  let description = `Sorter for "${sorter.title}"`;
  if (sorter.description) {
    description = sorter.description;
  }
  if (sorter.category) {
    description += ` - ${sorter.category} sorter on sortr`;
  }

  // Count total items
  let itemCount = items.length;
  if (tags && tags.length > 0) {
    // For tag-based sorters, use total items
    itemCount = items.length;
  } else if (sorter.useGroups) {
    // For group-based sorters, count items in groups
    itemCount = groups.reduce((total, group) => total + group.items.length, 0);
  }

  const fullDescription = `${description}. Sort ${itemCount} items through pairwise comparison and create your personalized results.`;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title,
      description: fullDescription,
      type: "website",
      siteName: "sortr",
      images: [
        {
          url: "/og-sorter.png", // We'll create this later
          width: 1200,
          height: 630,
          alt: `${sorter.title} - Ranking sorter`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: fullDescription,
      images: ["/og-sorter.png"],
    },
  };
}

async function getSorterWithItems(
  sorterSlug: string,
): Promise<SorterData | null> {
  // First get the sorter ID and deleted status from slug
  const sorterIdQuery = await db
    .select({ id: sorters.id, deleted: sorters.deleted })
    .from(sorters)
    .where(eq(sorters.slug, sorterSlug))
    .limit(1);

  if (sorterIdQuery.length === 0) {
    return null;
  }

  const sorter = sorterIdQuery[0];

  // Only increment view count for non-deleted sorters
  if (!sorter.deleted) {
    await db
      .update(sorters)
      .set({ viewCount: sql`${sorters.viewCount} + 1` })
      .where(eq(sorters.id, sorter.id));
  }

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

  const { sorter, items, groups, tags } = data;
  const recentResults = await getRecentResults(sorter.id);

  // Determine if filtering is needed (tags or groups exist)
  const hasFilters = (tags && tags.length > 0) || (sorter.useGroups && groups && groups.length > 0);

  // Get current session to check ownership
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  // Check if current user is the owner
  let isOwner = false;
  if (currentUserEmail && sorter.user?.id) {
    const userData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, currentUserEmail))
      .limit(1);

    isOwner = userData.length > 0 && userData[0].id === sorter.user.id;
  }

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Survey",
    name: sorter.title,
    description:
      sorter.description || `Sorter for "${sorter.title}"`,
    url: `${process.env.NEXTAUTH_URL}/sorter/${sorter.slug}`,
    dateCreated: sorter.createdAt,
    creator: {
      "@type": "Person",
      name: sorter.user.username || "Anonymous",
    },
    about: sorter.category || "Ranking",
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: sorter.viewCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CompleteAction",
        userInteractionCount: sorter.completionCount,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
        {/* Sorter Header */}
        <section className="mb-3">
          <div className="flex items-center space-x-3 py-4 md:space-x-6">
            {/* Cover Image */}
            <div className="border-border rounded-base flex h-28 w-28 items-center justify-center overflow-hidden border-2 md:h-48 md:w-48">
              {sorter.coverImageUrl ? (
                <img
                  src={sorter.coverImageUrl}
                  alt={`${sorter.title}'s cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
                  <span className="text-4xl font-bold">
                    {sorter.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Sorter Info */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <PageHeader>{sorter.title}</PageHeader>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
                <div className="flex items-center gap-1">
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
                  <Trophy size={16} />
                  <span>{sorter.completionCount}</span>
                </div>
                {/* <div className="flex items-center gap-1">
                  <span>
                    {new Date(sorter.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div> */}
              </div>

              {/* Desktop Action Buttons */}
              <div className="mt-4 hidden items-center gap-4 md:flex">
                {hasFilters ? (
                  <Button
                    asChild
                    size="default"
                    variant="default"
                    className="group"
                  >
                    <Link href={`/sorter/${sorter.slug}/filters`}>
                      <Play
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        size={20}
                      />
                      Sort Now
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="default"
                    variant="default"
                    className="group"
                  >
                    <Link href={`/sorter/${sorter.slug}/sort`}>
                      <Play
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        size={20}
                      />
                      Sort now
                    </Link>
                  </Button>
                )}

                {/* Delete Button - Only show for sorter owner */}
                {isOwner && (
                  <DeleteSorterButton
                    sorterSlug={sorter.slug}
                    sorterTitle={sorter.title}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Action Buttons */}
        <div className="mb-8 flex items-center gap-4 md:hidden">
          {hasFilters ? (
            <Button asChild size="default" variant="default" className="group">
              <Link href={`/sorter/${sorter.slug}/filters`}>
                <Play
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort Now
              </Link>
            </Button>
          ) : (
            <Button asChild size="default" variant="default" className="group">
              <Link href={`/sorter/${sorter.slug}/sort`}>
                <Play
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort now
              </Link>
            </Button>
          )}

          {/* Delete Button - Only show for sorter owner */}
          {isOwner && (
            <DeleteSorterButton
              sorterSlug={sorter.slug}
              sorterTitle={sorter.title}
            />
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Column - Items to Rank */}
          <section>
            <Panel variant="primary">
              <PanelHeader variant="primary">
                <PanelTitle>Items to Rank ({items?.length || 0})</PanelTitle>
              </PanelHeader>
              <PanelContent variant="primary" className="p-2 md:p-6">
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
                          {/* Group Header with Cover Image */}
                          <div className="flex items-center gap-3">
                            {/* Group Cover Image */}
                            {group.coverImageUrl ? (
                              <div className="border-border rounded-base h-12 w-12 flex-shrink-0 overflow-hidden border-2">
                                <img
                                  src={group.coverImageUrl}
                                  alt={`${group.name} cover`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="border-border bg-secondary-background rounded-base flex h-12 w-12 flex-shrink-0 items-center justify-center border-2">
                                <span className="text-main text-sm font-bold">
                                  {group.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}

                            {/* Group Name Badge */}
                            <Badge variant="default">{group.name}</Badge>
                          </div>

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
                                    {item.imageUrl || item.groupImageUrl ? (
                                      <div className="border-border rounded-base h-10 w-10 flex-shrink-0 overflow-hidden border-2">
                                        <img
                                          src={
                                            item.imageUrl
                                              ? getImageUrl(
                                                  item.imageUrl,
                                                  "thumbnail",
                                                )
                                              : getImageUrl(
                                                  item.groupImageUrl,
                                                  "full",
                                                )
                                          }
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
                                      <p className="font-medium break-words hyphens-auto">
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
                            {item.imageUrl || item.groupImageUrl ? (
                              <div className="border-border rounded-base h-10 w-10 flex-shrink-0 overflow-hidden border-2">
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
                              <div className="border-border bg-secondary-background rounded-base flex h-10 w-10 flex-shrink-0 items-center justify-center border-2">
                                <span className="text-main text-xs font-bold">
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
                <PanelTitle>
                  Recent Rankings ({recentResults.length})
                </PanelTitle>
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
                                    {item.imageUrl || item.groupImageUrl ? (
                                      <div className="border-border rounded-base h-6 w-6 flex-shrink-0 overflow-hidden border-2">
                                        <img
                                          src={
                                            item.imageUrl
                                              ? getImageUrl(
                                                  item.imageUrl,
                                                  "thumbnail",
                                                )
                                              : getImageUrl(
                                                  item.groupImageUrl,
                                                  "full",
                                                )
                                          }
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
      </main>
    </>
  );
}
