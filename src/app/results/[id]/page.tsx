import { notFound } from "next/navigation";
import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Share2, RotateCcw, Play } from "lucide-react";

interface ResultsPageProps {
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
    description: string;
    category: string;
    creatorUsername: string;
    createdAt: Date;
  };
}

async function getResultData(resultId: string): Promise<ResultData | null> {
  // Get the sorting result with username
  const resultData = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
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
      description: sorters.description,
      category: sorters.category,
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
      description: sorterData[0].description || "",
      category: sorterData[0].category || "",
      creatorUsername: sorterData[0].creatorUsername || "Unknown User",
      createdAt: sorterData[0].createdAt,
    },
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const data = await getResultData(id);

  if (!data) {
    notFound();
  }

  const { result, sorter } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        {/* Main Header: "[sorter name] \n sorted by [username]" */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4 md:mb-0">
            <div className="flex-1">
              <div>
                <Link href={`/sorter/${sorter.id}`}>
                  <h1 className="text-2xl font-bold mb-2 hover:underline cursor-pointer">{sorter.title}</h1>
                </Link>
                <p className="text-muted-foreground">
                  sorted by{" "}
                  <Link href={`/user/${result.username}`} className="font-semibold text-foreground hover:underline">
                    {result.username}
                  </Link>
                  {" "}at {new Date(result.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="hidden md:flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2" size={16} />
                Share
              </Button>
              <Link href={`/sorter/${sorter.id}/sort`}>
                <Button size="sm">
                  <Play className="mr-2" size={16} />
                  Sort now
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile buttons - shown under title section */}
          <div className="flex gap-2 md:hidden">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2" size={16} />
              Share
            </Button>
            <Link href={`/sorter/${sorter.id}/sort`}>
              <Button size="sm">
                <Play className="mr-2" size={16} />
                Sort now
              </Button>
            </Link>
          </div>
        </div>

      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Rankings (spans 2 columns on desktop) */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Rankings</h2>
          <div className="space-y-3">
            {result.rankings.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-card border rounded-lg"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                {/* Image */}
                {item.imageUrl ? (
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">No image</span>
                  </div>
                )}

                {/* Title */}
                <div className="flex-1">
                  <h3 className="font-medium">{item.title}</h3>
                </div>

                {/* Medal for top 3 */}
                {index === 0 && (
                  <div className="text-yellow-500">
                    <Trophy size={20} />
                  </div>
                )}
                {index === 1 && (
                  <div className="text-gray-400">
                    <Trophy size={18} />
                  </div>
                )}
                {index === 2 && (
                  <div className="text-amber-600">
                    <Trophy size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Sorter Info (desktop only) */}
        <div className="hidden md:block">
          <h2 className="text-xl font-bold mb-4">Sorter Info</h2>
          <Link href={`/sorter/${sorter.id}`} className="block">
            <Card className="hover:shadow-md hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 hover:border-primary/50">
              <CardContent>
              <div className="mb-3">
                <h3 className="font-medium text-lg mb-1">{sorter.title}</h3>
                <p className="text-sm text-muted-foreground">by {sorter.creatorUsername}</p>
              </div>

              <div className="mb-3">
                <span className="text-muted-foreground text-xs">
                  Created at {new Date(sorter.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Category */}
              {sorter.category && (
                <div>
                  <Badge>
                    {sorter.category}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
          </Link>
        </div>
      </div>

      {/* Mobile: Info Card (shows at bottom on mobile) */}
      <div className="md:hidden mt-8">
        <h2 className="text-xl font-bold mb-4">Sorter Info</h2>
        <Link href={`/sorter/${sorter.id}`} className="block">
          <Card className="hover:shadow-md hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 hover:border-primary/50">
            <CardContent className="px-4 py-3">
            <div className="mb-3">
              <h3 className="font-medium text-lg mb-1">{sorter.title}</h3>
              <p className="text-sm text-muted-foreground">by {sorter.creatorUsername}</p>
            </div>

            <div className="mb-3">
              <span className="text-muted-foreground text-xs">
                Created at {new Date(sorter.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Category */}
            {sorter.category && (
              <div>
                <Badge>
                  {sorter.category}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        </Link>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4">
        <Link href={`/sorter/${sorter.id}/sort`}>
          <Button>
            <Play className="mr-2" size={16} />
            Sort now
          </Button>
        </Link>
        <Link href={`/sorter/${sorter.id}`}>
          <Button variant="outline">
            View Sorter Details
          </Button>
        </Link>
      </div>
    </div>
  );
}