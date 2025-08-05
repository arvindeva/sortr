import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import {
  sortingResults,
  sorters,
  user,
  sorterTags,
  sorterItems,
  sorterHistory,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { PageHeader } from "@/components/ui/page-header";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { ArrowLeft, Trophy, RotateCcw, Play, Eye } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { DeleteRankingButton } from "@/components/delete-ranking-button";
import { AnimatedRankings } from "@/components/animated-rankings";
import { RankingImageLayout } from "@/components/ranking-image-layout";
import { getImageUrl } from "@/lib/image-utils";

interface RankingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface ResultData {
  result: {
    id: string;
    rankings: RankedItem[];
    createdAt: Date;
    username: string;
  };
  sorter: {
    id: string;
    title: string;
    slug: string | null;
    description: string;
    category: string;
    coverImageUrl?: string;
    creatorUsername: string;
    createdAt: Date;
    completionCount: number;
    viewCount: number;
    isDeleted: boolean;
  };
  selectedTagSlugs?: string[];
  totalTags?: {
    name: string;
    slug: string;
  }[];
  isOwner: boolean; // Whether current user owns this ranking
}

export async function generateMetadata({
  params,
}: RankingsPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const data = await getResultData(id);

    if (!data) {
      return {
        title: "Rankings Not Found",
        description: "The requested ranking could not be found.",
      };
    }

    const { result, sorter } = data;

    // Create content-first title: "Sorter Title Rankings by Username"
    const title = `${sorter.title} Rankings by ${result.username}`;

    // Get top 3 items for description
    const top3 = result.rankings.slice(0, 3);
    const top3Text = top3
      .map((item, i) => `${i + 1}. ${item.title}`)
      .join(", ");

    const description = `See ${result.username}'s ranking of ${sorter.title}. Top 3: ${top3Text}. View the complete personalized ranking.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "sortr",
        images: [
          {
            url: "/og-rankings.png", // We'll create this later
            width: 1200,
            height: 630,
            alt: `${sorter.title} Rankings by ${result.username}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-rankings.png"],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for rankings page:", error);
    return {
      title: "Rankings",
      description: "View rankings on sortr.",
    };
  }
}

async function getResultData(resultId: string): Promise<ResultData | null> {
  // Get current user session to check ownership
  const session = await getServerSession();
  let currentUserId: string | null = null;

  if (session?.user?.email) {
    const currentUserData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (currentUserData.length > 0) {
      currentUserId = currentUserData[0].id;
    }
  }
  // Get the sorting result with version information
  const resultData = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      selectedTagSlugs: sortingResults.selectedTagSlugs, // NEW: Get selected tag slugs
      createdAt: sortingResults.createdAt,
      sorterId: sortingResults.sorterId,
      userId: sortingResults.userId, // Get userId for ownership check
      version: sortingResults.version, // Get version
      username: user.username,
      // Sorter-level snapshots
      sorterTitle: sortingResults.sorterTitle,
      sorterCoverImageUrl: sortingResults.sorterCoverImageUrl,
    })
    .from(sortingResults)
    .leftJoin(user, eq(sortingResults.userId, user.id))
    .where(eq(sortingResults.id, resultId))
    .limit(1);

  if (resultData.length === 0) {
    return null;
  }

  const result = resultData[0];

  // NEW: Always query sorterHistory by version (consistent for all rankings)
  let historicalData: any[] = [];
  if (result.sorterId && result.version) {
    historicalData = await db
      .select({
        title: sorterHistory.title,
        description: sorterHistory.description,
        coverImageUrl: sorterHistory.coverImageUrl,
      })
      .from(sorterHistory)
      .where(
        and(
          eq(sorterHistory.sorterId, result.sorterId),
          eq(sorterHistory.version, result.version),
        ),
      )
      .limit(1);
  }

  // Get current sorter data for metadata (slug, stats, etc.)
  let liveSorterData: any[] = [];
  if (result.sorterId) {
    liveSorterData = await db
      .select({
        id: sorters.id,
        slug: sorters.slug,
        category: sorters.category,
        creatorUsername: user.username,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        deleted: sorters.deleted,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(eq(sorters.id, result.sorterId))
      .limit(1);
  }

  // Create sorter data using historical data with live metadata
  const liveSorter = liveSorterData[0];
  const historical = historicalData[0];

  const sorter = {
    // Use historical data for content (guaranteed to exist for all versions)
    title: historical?.title || result.sorterTitle || "Deleted Sorter",
    description: historical?.description || "",
    coverImageUrl: historical?.coverImageUrl || result.sorterCoverImageUrl,

    // Use live data for metadata and navigation
    id: result.sorterId || "deleted",
    slug: liveSorter?.slug || null,
    category: liveSorter?.category || "",
    creatorUsername: liveSorter?.creatorUsername || "Unknown User",
    createdAt: liveSorter?.createdAt || new Date(),
    completionCount: liveSorter?.completionCount || 0,
    viewCount: liveSorter?.viewCount || 0,
    isDeleted: !liveSorter || liveSorter.deleted,
  };

  // Parse the rankings JSON
  let parsedRankings: RankedItem[];
  try {
    parsedRankings = JSON.parse(result.rankings);
  } catch (error) {
    console.error("Failed to parse rankings JSON:", error);
    return null;
  }

  // REMOVED: No more live group image fetching
  // Rankings already contain the correct versioned URLs from when they were created
  const rankings: RankedItem[] = parsedRankings;

  // Groups no longer exist - only tags are supported

  // Get selected tag information (new tag-based system)
  let selectedTagNames: string[] = [];
  let totalTags: { name: string; slug: string }[] = [];

  if (
    result.selectedTagSlugs &&
    result.selectedTagSlugs.length > 0 &&
    result.sorterId
  ) {
    try {
      // Get all tags for this sorter
      const allTags = await db
        .select({
          name: sorterTags.name,
          slug: sorterTags.slug,
        })
        .from(sorterTags)
        .where(eq(sorterTags.sorterId, result.sorterId));

      totalTags = allTags;

      // Filter to only selected tags
      selectedTagNames = allTags
        .filter((tag) => result.selectedTagSlugs!.includes(tag.slug))
        .map((tag) => tag.name);
    } catch (error) {
      console.error("Failed to fetch selected tags:", error);
    }
  }

  return {
    result: {
      id: result.id,
      rankings,
      createdAt: result.createdAt,
      username: result.username || "Anonymous",
    },
    sorter: {
      id: sorter.id,
      title: sorter.title,
      slug: sorter.slug,
      description: sorter.description,
      category: sorter.category,
      coverImageUrl: sorter.coverImageUrl,
      creatorUsername: sorter.creatorUsername,
      createdAt: sorter.createdAt,
      completionCount: sorter.completionCount,
      viewCount: sorter.viewCount,
      isDeleted: sorter.isDeleted,
    },
    selectedTagSlugs:
      selectedTagNames.length > 0 ? selectedTagNames : undefined,
    totalTags: totalTags.length > 0 ? totalTags : undefined,
    isOwner: currentUserId !== null && result.userId === currentUserId, // Check ownership
  };
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const data = await getResultData(id);

  if (!data) {
    notFound();
  }

  const { result, sorter, selectedTagSlugs, totalTags, isOwner } = data;

  // JSON-LD structured data for rankings
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Survey",
      name: sorter.title,
      description: sorter.description || `Sorter for ${sorter.title}`,
      ...(sorter.slug && {
        url: `${process.env.NEXTAUTH_URL}/sorter/${sorter.slug}`,
      }),
      about: sorter.category || "Ranking",
      creator: {
        "@type": "Person",
        name: sorter.creatorUsername || "Unknown User",
      },
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
    },
    author: {
      "@type": "Person",
      name: result.username || "Anonymous",
    },
    dateCreated: result.createdAt.toISOString(),
    name: `${sorter.title} Rankings by ${result.username}`,
    description: `Personalized sorter results for ${sorter.title} by ${result.username}. View the complete ranked list of items.`,
    url: `${process.env.NEXTAUTH_URL}/rankings/${result.id}`,
    mainEntity: {
      "@type": "ItemList",
      name: `${sorter.title} Rankings`,
      description: `Sorted list of items from ${sorter.title}`,
      numberOfItems: result.rankings.length,
      itemListElement: result.rankings.slice(0, 10).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        ...(item.imageUrl && { image: item.imageUrl }),
      })),
    },
    ...(selectedTagSlugs &&
      selectedTagSlugs.length > 0 && {
        about: selectedTagSlugs.join(", "),
      }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto max-w-6xl overflow-hidden px-2 py-2 md:px-4 md:py-8">
        {/* Header */}
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

            {/* Ranking Info */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                {!sorter.isDeleted && sorter.slug ? (
                  <Link href={`/sorter/${sorter.slug}`}>
                    <PageHeader className="cursor-pointer hover:underline">
                      {sorter.title}
                    </PageHeader>
                  </Link>
                ) : (
                  <PageHeader>
                    {sorter.title}
                    {sorter.isDeleted && (
                      <span className="ml-2 text-sm text-red-600 dark:text-red-400">
                        (Deleted)
                      </span>
                    )}
                  </PageHeader>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
                <div className="flex items-center gap-1">
                  <span>sorted by</span>
                  {result.username && result.username !== "Anonymous" ? (
                    <Link
                      href={`/user/${result.username}`}
                      className="font-bold hover:underline"
                    >
                      {result.username}
                    </Link>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      Anonymous
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="mt-4 hidden items-center gap-4 md:flex">
                {!sorter.isDeleted && sorter.slug ? (
                  <Button asChild variant="default">
                    <Link href={`/sorter/${sorter.slug}/sort`}>
                      <Play size={16} />
                      Sort This
                    </Link>
                  </Button>
                ) : (
                  <Button variant="neutral" disabled>
                    <Play size={16} />
                    Sorter Deleted
                  </Button>
                )}
                <ShareButton
                  rankingData={{
                    sorterTitle: sorter.title,
                    username: result.username,
                    rankings: result.rankings,
                    createdAt: result.createdAt,
                    selectedTags: selectedTagSlugs,
                  }}
                />
                {isOwner && (
                  <DeleteRankingButton
                    rankingId={result.id}
                    sorterTitle={sorter.title}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4 md:hidden">
          {!sorter.isDeleted && sorter.slug ? (
            <Button asChild variant="default">
              <Link href={`/sorter/${sorter.slug}/sort`}>
                <Play size={16} />
                Sort This
              </Link>
            </Button>
          ) : (
            <Button variant="neutral" disabled>
              <Play size={16} />
              Sorter Deleted
            </Button>
          )}
          <ShareButton
            rankingData={{
              sorterTitle: sorter.title,
              username: result.username,
              rankings: result.rankings,
              createdAt: result.createdAt,
              selectedTags: selectedTagSlugs,
            }}
          />
          {isOwner && (
            <DeleteRankingButton
              rankingId={result.id}
              sorterTitle={sorter.title}
            />
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column - Rankings (spans 2 columns on desktop) */}
          <div className="md:col-span-2">
            <Panel variant="primary">
              <PanelHeader variant="primary">
                <PanelTitle>Rankings</PanelTitle>
              </PanelHeader>
              <PanelContent
                variant="primary"
                className="overflow-hidden p-2 md:p-6"
              >
                <AnimatedRankings rankings={result.rankings} />
              </PanelContent>
            </Panel>
          </div>

          {/* Right Column (desktop only) */}
          <div className="hidden space-y-8 md:block">
            {/* Filters Used Panel - Only show if filters were used */}
            {selectedTagSlugs && (
              <Panel variant="primary">
                <PanelHeader variant="primary">
                  <PanelTitle>Filters Used</PanelTitle>
                </PanelHeader>
                <PanelContent variant="primary" className="p-2 md:p-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedTagSlugs &&
                      selectedTagSlugs.map((tagName) => (
                        <Badge key={tagName} variant="neutral">
                          {tagName}
                        </Badge>
                      ))}
                  </div>
                </PanelContent>
              </Panel>
            )}

            {/* Sorter Info Panel */}
            <Panel variant="primary">
              <PanelHeader variant="primary">
                <PanelTitle>Sorter Info</PanelTitle>
              </PanelHeader>
              <PanelContent variant="primary" className="p-2 md:p-6">
                <div className="space-y-4">
                  <div>
                    {!sorter.isDeleted && sorter.slug ? (
                      <Link
                        href={`/sorter/${sorter.slug}`}
                        className="sorter-title-link hover:underline"
                      >
                        <h3 className="mb-1 text-lg font-bold">
                          {sorter.title}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="mb-1 text-lg font-bold">
                        {sorter.title}
                        {sorter.isDeleted && (
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {" "}
                            (Deleted)
                          </span>
                        )}
                      </h3>
                    )}
                    <p>
                      by{" "}
                      {sorter.creatorUsername &&
                      sorter.creatorUsername !== "Unknown User" ? (
                        <Link
                          href={`/user/${sorter.creatorUsername}`}
                          className="font-medium hover:underline"
                        >
                          {sorter.creatorUsername}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          {sorter.creatorUsername}
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Category */}
                  {sorter.category && (
                    <div>
                      <Badge variant="default">{sorter.category}</Badge>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <Eye size={16} />
                      <span>{sorter.viewCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy size={16} />
                      <span>{sorter.completionCount}</span>
                    </div>
                  </div>
                </div>
              </PanelContent>
            </Panel>
          </div>
        </div>

        {/* Mobile: Info Card (shows at bottom on mobile) */}
        <div className="mt-8 md:hidden">
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Sorter Info</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-3 md:p-6">
              <div className="space-y-4">
                <div>
                  {!sorter.isDeleted && sorter.slug ? (
                    <Link
                      href={`/sorter/${sorter.slug}`}
                      className="sorter-title-link hover:underline"
                    >
                      <h3 className="mb-1 text-lg font-bold">{sorter.title}</h3>
                    </Link>
                  ) : (
                    <h3 className="mb-1 text-lg font-bold">
                      {sorter.title}
                      {sorter.isDeleted && (
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {" "}
                          (Deleted)
                        </span>
                      )}
                    </h3>
                  )}
                  <p>
                    by{" "}
                    {sorter.creatorUsername &&
                    sorter.creatorUsername !== "Unknown User" ? (
                      <Link
                        href={`/user/${sorter.creatorUsername}`}
                        className="font-medium hover:underline"
                      >
                        {sorter.creatorUsername}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        {sorter.creatorUsername}
                      </span>
                    )}
                  </p>
                </div>
                {/* Category */}
                {sorter.category && (
                  <div>
                    <Badge variant="default">{sorter.category}</Badge>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span>{sorter.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy size={16} />
                    <span>{sorter.completionCount}</span>
                  </div>
                </div>
              </div>
            </PanelContent>
          </Panel>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-4">
          {!sorter.isDeleted && sorter.slug ? (
            <>
              <Button asChild>
                <Link href={`/sorter/${sorter.slug}/sort`}>
                  <Play className="mr-2" size={16} />
                  Sort now
                </Link>
              </Button>
              <Button asChild variant="neutral">
                <Link href={`/sorter/${sorter.slug}`}>View Sorter Details</Link>
              </Button>
            </>
          ) : (
            <Button variant="neutral" disabled>
              Original sorter no longer available
            </Button>
          )}
        </div>

        {/* Development Preview: Image Layout */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-12 border-t-2 border-dashed border-gray-300 pt-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-600">
                Development Preview: Downloadable Image Layout
              </h2>
              <p className="text-gray-500">
                This preview shows what the downloaded image will look like.
                This section is only visible in development.
              </p>
            </div>

            <div className="overflow-auto bg-gray-100 p-4">
              <RankingImageLayout
                sorterTitle={sorter.title}
                username={result.username}
                rankings={result.rankings}
                createdAt={result.createdAt}
                selectedTags={selectedTagSlugs}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
