import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/db";
import { sortingResults, sorters, user, sorterGroups } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { ArrowLeft, Trophy, RotateCcw, Play } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { AnimatedRankings } from "@/components/animated-rankings";
import { RankingImageLayout } from "@/components/ranking-image-layout";

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
    slug: string;
    description: string;
    category: string;
    useGroups: boolean;
    creatorUsername: string;
    createdAt: Date;
  };
  selectedGroups?: {
    id: string;
    name: string;
  }[];
}

export async function generateMetadata({
  params,
}: RankingsPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const data = await getResultData(id);

    if (!data) {
      return {
        title: "Rankings Not Found | sortr",
        description: "The requested ranking could not be found.",
      };
    }

    const { result, sorter } = data;

    // Create content-first title: "Sorter Title Rankings by Username | sortr"
    const title = `${sorter.title} Rankings by ${result.username} | sortr`;

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
      title: "Rankings | sortr",
      description: "View rankings on sortr.",
    };
  }
}

async function getResultData(resultId: string): Promise<ResultData | null> {
  // Get the sorting result with username
  const resultData = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      selectedGroups: sortingResults.selectedGroups,
      createdAt: sortingResults.createdAt,
      sorterId: sortingResults.sorterId,
      username: user.username,
    })
    .from(sortingResults)
    .leftJoin(user, eq(sortingResults.userId, user.id))
    .where(eq(sortingResults.id, resultId))
    .limit(1);

  if (resultData.length === 0) {
    return null;
  }

  const result = resultData[0];

  // Get the sorter data
  const sorterData = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      description: sorters.description,
      category: sorters.category,
      useGroups: sorters.useGroups,
      creatorUsername: user.username,
      createdAt: sorters.createdAt,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(eq(sorters.id, result.sorterId))
    .limit(1);

  if (sorterData.length === 0) {
    return null;
  }

  // Parse the rankings JSON
  let rankings: RankedItem[];
  try {
    rankings = JSON.parse(result.rankings);
  } catch (error) {
    console.error("Failed to parse rankings JSON:", error);
    return null;
  }

  // Get selected groups if this result used groups
  let selectedGroups: { id: string; name: string }[] = [];
  if (result.selectedGroups) {
    try {
      const selectedGroupIds: string[] = JSON.parse(result.selectedGroups);
      if (selectedGroupIds.length > 0) {
        const groupsData = await db
          .select({
            id: sorterGroups.id,
            name: sorterGroups.name,
          })
          .from(sorterGroups)
          .where(inArray(sorterGroups.id, selectedGroupIds));

        selectedGroups = groupsData;
      }
    } catch (error) {
      console.error("Failed to parse selected groups JSON:", error);
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
      id: sorterData[0].id,
      title: sorterData[0].title,
      slug: sorterData[0].slug,
      description: sorterData[0].description || "",
      category: sorterData[0].category || "",
      useGroups: sorterData[0].useGroups,
      creatorUsername: sorterData[0].creatorUsername || "Unknown User",
      createdAt: sorterData[0].createdAt,
    },
    selectedGroups: selectedGroups.length > 0 ? selectedGroups : undefined,
  };
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const data = await getResultData(id);

  if (!data) {
    notFound();
  }

  const { result, sorter, selectedGroups } = data;

  return (
    <div className="container mx-auto max-w-4xl overflow-hidden px-2 py-8 md:px-4">
      {/* Header */}
      <div className="mb-8">
        {/* Main Header */}
        <Box variant="primary" size="md" className="mb-6 block">
          <div>
            <Link href={`/sorter/${sorter.slug}`}>
              <h1 className="mb-2 cursor-pointer text-xl font-bold hover:underline">
                {sorter.title}
              </h1>
            </Link>
            <p className="text-md font-medium">
              sorted by{" "}
              <Link
                href={`/user/${result.username}`}
                className="font-semibold hover:underline"
              >
                {result.username}
              </Link>{" "}
              at{" "}
              {new Date(result.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </Box>

        {/* Share and Sort Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <ShareButton 
            rankingData={{
              sorterTitle: sorter.title,
              username: result.username,
              rankings: result.rankings,
              createdAt: result.createdAt,
              selectedGroups: selectedGroups?.map(group => group.name),
            }}
          />
          <Button asChild variant="default">
            <Link
              href={
                sorter.useGroups
                  ? `/sorter/${sorter.slug}/filters`
                  : `/sorter/${sorter.slug}/sort`
              }
            >
              <RotateCcw className="mr-2" size={16} />
              Sort Again
            </Link>
          </Button>
        </div>

        {/* Filter badges - shown if groups were selected */}
        {selectedGroups && selectedGroups.length > 0 && (
          <div className="mb-4">
            <p className="text-muted-foreground mb-2 text-sm">
              Groups sorted: {selectedGroups.length}{" "}
              {selectedGroups.length === 1 ? "group" : "groups"}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedGroups.map((group) => (
                <Badge key={group.id} variant="neutral" className="text-xs">
                  {group.name}
                </Badge>
              ))}
            </div>
          </div>
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

        {/* Right Column - Sorter Info (desktop only) */}
        <div className="hidden md:block">
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Sorter Info</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              <Link
                href={`/sorter/${sorter.slug}`}
                className="block transition-opacity hover:opacity-80"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1 text-lg font-bold">{sorter.title}</h3>
                    <p className="text-sm">by {sorter.creatorUsername}</p>
                  </div>

                  <div>
                    <span className="text-sm">
                      Created at{" "}
                      {new Date(sorter.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Category */}
                  {sorter.category && (
                    <div>
                      <Badge variant="default">{sorter.category}</Badge>
                    </div>
                  )}
                </div>
              </Link>
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
            <Link
              href={`/sorter/${sorter.slug}`}
              className="block transition-opacity hover:opacity-80"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-lg font-bold">{sorter.title}</h3>
                  <p className="text-sm">by {sorter.creatorUsername}</p>
                </div>

                <div>
                  <span className="text-sm">
                    Created at{" "}
                    {new Date(sorter.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Category */}
                {sorter.category && (
                  <div>
                    <Badge variant="default">{sorter.category}</Badge>
                  </div>
                )}
              </div>
            </Link>
          </PanelContent>
        </Panel>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4">
        <Button asChild>
          <Link
            href={
              sorter.useGroups
                ? `/sorter/${sorter.slug}/filters`
                : `/sorter/${sorter.slug}/sort`
            }
          >
            <Play className="mr-2" size={16} />
            Sort now
          </Link>
        </Button>
        <Button asChild variant="neutral">
          <Link href={`/sorter/${sorter.slug}`}>View Sorter Details</Link>
        </Button>
      </div>

      {/* Development Preview: Image Layout */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 border-t-2 border-dashed border-gray-300 pt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-600">
              Development Preview: Downloadable Image Layout
            </h2>
            <p className="text-sm text-gray-500">
              This preview shows what the downloaded image will look like. This section is only visible in development.
            </p>
          </div>
          
          <div className="overflow-auto bg-gray-100 p-4">
            <RankingImageLayout
              sorterTitle={sorter.title}
              username={result.username}
              rankings={result.rankings}
              createdAt={result.createdAt}
              selectedGroups={selectedGroups?.map(group => group.name)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
