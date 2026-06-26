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
import { CoverTile } from "@/components/ui/cover-tile";
import { Play } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { AnimatedRankings } from "@/components/animated-rankings";
import { ResultShareImage } from "@/components/result-share-image";
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
        // OG image falls back to the generic app/opengraph-image.tsx for now.
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
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
      <div className="container mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <section className="mb-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
            {/* Cover — desktop only (hidden on mobile to save space) */}
            <CoverTile
              imageUrl={sorter.coverImageUrl}
              name={sorter.title}
              colorKey={sorter.slug ?? sorter.title}
              nameSize={26}
              radius={14}
              className="hidden shrink-0 sm:flex sm:h-40 sm:w-40"
            />

            <div className="min-w-0 flex-1">
              {!sorter.isDeleted && sorter.slug ? (
                <Link href={`/sorter/${sorter.slug}`}>
                  <h1 className="display text-[clamp(2.25rem,6vw,3.75rem)] font-black text-foreground transition-colors hover:text-main-ink">
                    {sorter.title}
                  </h1>
                </Link>
              ) : (
                <h1 className="display text-[clamp(2.25rem,6vw,3.75rem)] font-black text-foreground">
                  {sorter.title}
                  {sorter.isDeleted && (
                    <span className="ml-2 align-middle font-mono text-sm text-destructive">
                      (deleted)
                    </span>
                  )}
                </h1>
              )}
              <div className="mt-2.5 font-mono text-[13px] text-muted-foreground">
                sorted by{" "}
                {result.username && result.username !== "Anonymous" ? (
                  <Link
                    href={`/user/${result.username}`}
                    className="text-cyan-ink hover:underline"
                  >
                    @{result.username}
                  </Link>
                ) : (
                  <span className="text-foreground">Anonymous</span>
                )}
              </div>

              {/* Action Buttons — one line on mobile (CTA flex-1 + icons) */}
              <div className="mt-5 flex items-center gap-2.5 sm:flex-wrap sm:gap-3">
                {!sorter.isDeleted && sorter.slug ? (
                  <Button
                    asChild
                    size="lg"
                    arcade
                    className="group flex-1 sm:flex-none"
                  >
                    <Link href={`/sorter/${sorter.slug}/sort`}>
                      <Play
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        size={18}
                      />
                      Sort it yourself
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="neutral"
                    size="lg"
                    arcade
                    disabled
                    className="flex-1 sm:flex-none"
                  >
                    Sorter deleted
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
            </div>
          </div>
        </section>

        {/* Body: Final order + Sorter info */}
        <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-start">
          {/* Final order. No overflow-hidden wrapper — it clipped the medal
              glow on the top-3 rows. A little padding gives the glow room. */}
          <section className="px-1 py-1">
            <AnimatedRankings rankings={result.rankings} />
          </section>

          {/* Sorter info panel */}
          <aside className="rounded-2xl border border-border bg-card p-6">
            <div className="hud mb-3.5 text-xs text-muted-foreground">
              Sorter info
            </div>
            {!sorter.isDeleted && sorter.slug ? (
              <Link href={`/sorter/${sorter.slug}`}>
                <h3 className="display text-2xl font-extrabold text-foreground transition-colors hover:text-main-ink">
                  {sorter.title}
                </h3>
              </Link>
            ) : (
              <h3 className="display text-2xl font-extrabold text-foreground">
                {sorter.title}
              </h3>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              by{" "}
              {sorter.creatorUsername &&
              sorter.creatorUsername !== "Unknown User" ? (
                <Link
                  href={`/user/${sorter.creatorUsername}`}
                  className="font-semibold text-cyan-ink hover:underline"
                >
                  @{sorter.creatorUsername}
                </Link>
              ) : (
                <span className="text-foreground">{sorter.creatorUsername}</span>
              )}
            </p>
            {sorter.category && (
              <div className="mt-3.5">
                <span className="inline-block rounded-full border border-main/40 bg-accent px-3 py-1 font-mono text-xs text-main-ink">
                  {sorter.category}
                </span>
              </div>
            )}

            <div className="my-4.5 h-px bg-border" />

            <dl className="flex flex-col gap-3 font-mono text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">PLAYS</dt>
                <dd className="text-foreground">
                  {sorter.completionCount.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ITEMS</dt>
                <dd className="text-foreground">{result.rankings.length}</dd>
              </div>
            </dl>

            {!sorter.isDeleted && sorter.slug && (
              <Button asChild variant="neutral" className="mt-5 w-full">
                <Link href={`/sorter/${sorter.slug}`}>View sorter page →</Link>
              </Button>
            )}
          </aside>
        </div>

        {/* Development Preview: the downloadable share image */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-12 border-t border-dashed border-border pt-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-muted-foreground">
                Development Preview: Downloadable Image
              </h2>
              <p className="text-muted-foreground">
                What the downloaded image looks like. Dev-only.
              </p>
            </div>

            <div className="overflow-auto bg-muted p-4">
              <ResultShareImage
                title={sorter.title}
                subtitle={`Sorted by ${
                  result.username && result.username !== "Anonymous"
                    ? `@${result.username}`
                    : "@anon"
                }`}
                items={result.rankings.slice(0, 10).map((r) => ({
                  id: r.id,
                  name: r.title,
                  imageUrl: r.imageUrl,
                }))}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
