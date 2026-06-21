import { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
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
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Trophy, Play } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { AnimatedRankings } from "@/components/animated-rankings";
import { RankingImageLayout } from "@/components/ranking-image-layout";
import { getImageUrl } from "@/lib/image-utils";
import { RankingOwnerActions } from "@/components/ranking-owner-actions";

interface RankingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Force static generation with 1 hour revalidation - enables full route cache
export const dynamic = 'force-static';
export const revalidate = 3600; // 1 hour

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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
    createdAt: Date | string; // Allow both for caching
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
    createdAt: Date | string; // Allow both for caching
    completionCount: number;
    isDeleted: boolean;
  };
  selectedTagSlugs?: string[];
  totalTags?: {
    name: string;
    slug: string;
  }[];
  ownerUserId: string | null;
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
    const baseUrl = process.env.NEXTAUTH_URL || "https://sortr.io";
    const canonicalUrl = `${baseUrl}/rankings/${id}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "sortr",
        url: canonicalUrl,
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

// Core immutable data - cached forever
interface CoreRankingData {
  result: {
    id: string;
    rankings: RankedItem[];
    createdAt: string;
    username: string;
  };
  sorter: {
    id: string;
    title: string;
    description: string;
    coverImageUrl?: string;
    category: string;
    creatorUsername: string;
    createdAt: string;
    slug: string | null;
    completionCount: number;
    isDeleted: boolean;
  };
  selectedTagSlugs?: string[];
  totalTags?: {
    name: string;
    slug: string;
  }[];
  ownerUserId: string | null;
}

async function getCoreRankingDataUncached(resultId: string): Promise<CoreRankingData | null> {
  // Validate UUID format first
  if (!isValidUUID(resultId)) {
    return null;
  }

  // Get the sorting result with version information
  const resultData = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      selectedTagSlugs: sortingResults.selectedTagSlugs,
      createdAt: sortingResults.createdAt,
      sorterId: sortingResults.sorterId,
      userId: sortingResults.userId,
      version: sortingResults.version,
      username: user.username,
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

  // Query sorterHistory by version for immutable data
  let historicalData: any[] = [];
  if (result.sorterId && result.version) {
    historicalData = await db
      .select({
        title: sorterHistory.title,
        description: sorterHistory.description,
        coverImageUrl: sorterHistory.coverImageUrl,
        category: sorters.category,
        creatorUsername: user.username,
        createdAt: sorters.createdAt,
        slug: sorters.slug,
        completionCount: sorters.completionCount,
        deleted: sorters.deleted,
      })
      .from(sorterHistory)
      .leftJoin(sorters, eq(sorterHistory.sorterId, sorters.id))
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(
        and(
          eq(sorterHistory.sorterId, result.sorterId),
          eq(sorterHistory.version, result.version),
        ),
      )
      .limit(1);
  }

  const historical = historicalData[0];

  // Parse the rankings JSON
  let parsedRankings: RankedItem[];
  try {
    parsedRankings = JSON.parse(result.rankings);
  } catch (error) {
    console.error("Failed to parse rankings JSON:", error);
    return null;
  }

  // Get selected tag information
  let selectedTagNames: string[] = [];
  let totalTags: { name: string; slug: string }[] = [];

  if (
    result.selectedTagSlugs &&
    result.selectedTagSlugs.length > 0 &&
    result.sorterId
  ) {
    try {
      const allTags = await db
        .select({
          name: sorterTags.name,
          slug: sorterTags.slug,
        })
        .from(sorterTags)
        .where(eq(sorterTags.sorterId, result.sorterId));

      totalTags = allTags;
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
      rankings: parsedRankings,
      createdAt: result.createdAt.toISOString(),
      username: result.username || "Anonymous",
    },
    sorter: {
      id: result.sorterId || "deleted",
      title: historical?.title || result.sorterTitle || "Deleted Sorter",
      description: historical?.description || "",
      coverImageUrl: historical?.coverImageUrl || result.sorterCoverImageUrl,
      category: historical?.category || "",
      creatorUsername: historical?.creatorUsername || "Unknown User",
      createdAt: historical?.createdAt?.toISOString() || new Date().toISOString(),
      slug: historical?.slug || null,
      completionCount: historical?.completionCount || 0,
      isDeleted: historical?.deleted || false,
    },
    selectedTagSlugs:
      selectedTagNames.length > 0 ? selectedTagNames : undefined,
    totalTags: totalTags.length > 0 ? totalTags : undefined,
    ownerUserId: result.userId,
  };
}

// Optimized data fetcher - caches immutable snapshot data only
async function getResultData(resultId: string): Promise<ResultData | null> {
  // Cache core ranking data (immutable snapshot)
  const coreData = await unstable_cache(
    async () => getCoreRankingDataUncached(resultId),
    [`ranking-data-v6`, resultId], // Bumped version for new fields
    {
      revalidate: false, // Never expire - rankings are immutable
      tags: [`ranking-${resultId}`],
    }
  )();

  if (!coreData) return null;

  // Return snapshot data with Date conversions
  return {
    ...coreData,
    result: {
      ...coreData.result,
      createdAt: new Date(coreData.result.createdAt),
    },
    sorter: {
      ...coreData.sorter,
      createdAt: new Date(coreData.sorter.createdAt),
    },
  };
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const data = await getResultData(id);

  if (!data) {
    notFound();
  }

  const { result, sorter, selectedTagSlugs, totalTags, ownerUserId } = data;

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
          interactionType: "https://schema.org/CompleteAction",
          userInteractionCount: sorter.completionCount,
        },
      ],
    },
    author: {
      "@type": "Person",
      name: result.username || "Anonymous",
    },
    dateCreated: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
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
            <div className="border-border rounded-base flex h-28 w-28 items-center justify-center overflow-hidden border shadow-md md:h-48 md:w-48">
              {sorter.coverImageUrl ? (
                <img
                  src={sorter.coverImageUrl}
                  alt={`${sorter.title}'s cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-gradient-to-br from-muted to-secondary flex h-full w-full items-center justify-center">
                  <span className="text-4xl font-semibold text-muted-foreground/40">
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
                    <h1 className="cursor-pointer text-3xl font-bold tracking-tight hover:underline md:text-4xl">
                      {sorter.title}
                    </h1>
                  </Link>
                ) : (
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    {sorter.title}
                    {sorter.isDeleted && (
                      <span className="ml-2 text-sm text-destructive">
                        (Deleted)
                      </span>
                    )}
                  </h1>
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
                    <span className="text-muted-foreground">
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
                    createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
                    selectedTags: selectedTagSlugs,
                  }}
                />
                <RankingOwnerActions
                  ownerUserId={ownerUserId}
                  rankingId={result.id}
                  sorterTitle={sorter.title}
                />
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
            hideTextOnMobile
            rankingData={{
              sorterTitle: sorter.title,
              username: result.username,
              rankings: result.rankings,
              createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
              selectedTags: selectedTagSlugs,
            }}
          />
          <RankingOwnerActions
            ownerUserId={ownerUserId}
            rankingId={result.id}
            sorterTitle={sorter.title}
            hideTextOnMobile
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column - Rankings (spans 2 columns on desktop) */}
          <div className="md:col-span-2">
            <section>
              <SectionHeading as="h2">Rankings</SectionHeading>
              <div className="overflow-hidden">
                <AnimatedRankings rankings={result.rankings} />
              </div>
            </section>
          </div>

          {/* Right Column (desktop only) */}
          <div className="hidden space-y-8 md:block">
            {/* Filters Used - Only show if filters were used */}
            {selectedTagSlugs && (
              <section>
                <SectionHeading as="h2">Filters Used</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {selectedTagSlugs &&
                    selectedTagSlugs.map((tagName) => (
                      <Badge key={tagName} variant="neutral">
                        {tagName}
                      </Badge>
                    ))}
                </div>
              </section>
            )}

            {/* Sorter Info */}
            <section>
              <SectionHeading as="h2">Sorter Info</SectionHeading>
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
                          <span className="text-sm text-destructive">
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
                        <span className="font-medium text-muted-foreground">
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
                      <Trophy size={16} />
                      <span>{sorter.completionCount}</span>
                    </div>
                  </div>
                </div>
            </section>
          </div>
        </div>

        {/* Mobile: Info section (shows at bottom on mobile) */}
        <div className="mt-8 md:hidden">
          <section>
            <SectionHeading as="h2">Sorter Info</SectionHeading>
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
                        <span className="text-sm text-destructive">
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
                      <span className="font-medium text-muted-foreground">
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
                    <Trophy size={16} />
                    <span>{sorter.completionCount}</span>
                  </div>
                </div>
            </div>
          </section>
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
          <div className="mt-12 border-t border-dashed border-border pt-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-muted-foreground">
                Development Preview: Downloadable Image Layout
              </h2>
              <p className="text-muted-foreground">
                This preview shows what the downloaded image will look like.
                This section is only visible in development.
              </p>
            </div>

            <div className="overflow-auto bg-muted p-4">
              <RankingImageLayout
                sorterTitle={sorter.title}
                username={result.username}
                rankings={result.rankings}
                createdAt={result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt)}
                selectedTags={selectedTagSlugs}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
