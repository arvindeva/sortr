import { notFound } from "next/navigation";
import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, RotateCcw, Play } from "lucide-react";
import { ShareButton } from "@/components/share-button";

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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Main Header: "[sorter name] \n sorted by [username]" */}
        <div className="mb-6">
          <div className="mb-4 flex items-start justify-between md:mb-0">
            <div className="flex-1">
              <div>
                <Link href={`/sorter/${sorter.id}`}>
                  <h1 className="mb-2 cursor-pointer text-2xl font-bold hover:underline">
                    {sorter.title}
                  </h1>
                </Link>
                <p className="text-muted-foreground">
                  sorted by{" "}
                  <Link
                    href={`/user/${result.username}`}
                    className="text-foreground font-semibold hover:underline"
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
            </div>

            <div className="hidden gap-2 md:flex">
              <ShareButton size="sm" />
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
            <ShareButton size="sm" />
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
      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column - Rankings (spans 2 columns on desktop) */}
        <div className="md:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Rankings</h2>
          <div className="space-y-3">
            {result.rankings.map((item, index) => (
              <div
                key={item.id}
                className="bg-card flex items-center gap-4 rounded-lg border p-4"
              >
                {/* Rank */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold ${
                    index === 0
                      ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                      : index === 1
                        ? "border-gray-400 bg-gray-50 text-gray-700"
                        : index === 2
                          ? "border-amber-600 bg-amber-50 text-amber-700"
                          : "bg-primary text-primary-foreground"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Image */}
                {item.imageUrl ? (
                  <div
                    className={`bg-muted h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-4 ${
                      index === 0
                        ? "border-yellow-500"
                        : index === 1
                          ? "border-gray-400"
                          : index === 2
                            ? "border-amber-600"
                            : "border-transparent"
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-4 bg-gray-100 ${
                      index === 0
                        ? "border-yellow-500"
                        : index === 1
                          ? "border-gray-400"
                          : index === 2
                            ? "border-amber-600"
                            : "border-transparent"
                    }`}
                  >
                    <span className="text-muted-foreground text-sm font-bold">
                      {item.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Title */}
                <div className="flex-1">
                  <h3 className="font-medium">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Sorter Info (desktop only) */}
        <div className="hidden md:block">
          <h2 className="mb-4 text-xl font-bold">Sorter Info</h2>
          <Link href={`/sorter/${sorter.id}`} className="block">
            <Card className="hover:border-primary/50 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
              <CardContent>
                <div className="mb-3">
                  <h3 className="mb-1 text-lg font-medium">{sorter.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    by {sorter.creatorUsername}
                  </p>
                </div>

                <div className="mb-3">
                  <span className="text-muted-foreground text-xs">
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
                    <Badge>{sorter.category}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Mobile: Info Card (shows at bottom on mobile) */}
      <div className="mt-8 md:hidden">
        <h2 className="mb-4 text-xl font-bold">Sorter Info</h2>
        <Link href={`/sorter/${sorter.id}`} className="block">
          <Card className="hover:border-primary/50 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
            <CardContent className="px-4 py-3">
              <div className="mb-3">
                <h3 className="mb-1 text-lg font-medium">{sorter.title}</h3>
                <p className="text-muted-foreground text-sm">
                  by {sorter.creatorUsername}
                </p>
              </div>

              <div className="mb-3">
                <span className="text-muted-foreground text-xs">
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
                  <Badge>{sorter.category}</Badge>
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
          <Button variant="outline">View Sorter Details</Button>
        </Link>
      </div>
    </div>
  );
}
