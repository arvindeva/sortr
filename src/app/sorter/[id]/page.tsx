import { notFound } from "next/navigation";
import { db } from "@/db";
import { sorters, sorterItems, sortingResults, user } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, User, Calendar, Eye, Trophy } from "lucide-react";

interface SorterPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getSorterWithItems(sorterId: string) {
  // Increment view count
  await db
    .update(sorters)
    .set({ viewCount: sql`${sorters.viewCount} + 1` })
    .where(eq(sorters.id, sorterId));

  // Get sorter data with creator info
  const sorterData = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      description: sorters.description,
      category: sorters.category,
      createdAt: sorters.createdAt,
      completionCount: sorters.completionCount,
      viewCount: sorters.viewCount,
      creatorUsername: user.username,
      creatorId: user.id,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(eq(sorters.id, sorterId))
    .limit(1);

  if (sorterData.length === 0) {
    return null;
  }

  // Get sorter items
  const items = await db
    .select({
      id: sorterItems.id,
      title: sorterItems.title,
      imageUrl: sorterItems.imageUrl,
    })
    .from(sorterItems)
    .where(eq(sorterItems.sorterId, sorterId));

  return {
    sorter: sorterData[0],
    items,
  };
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
  const { id } = await params;
  const [data, recentResults] = await Promise.all([
    getSorterWithItems(id),
    getRecentResults(id),
  ]);

  if (!data) {
    notFound();
  }

  const { sorter, items } = data;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Sorter Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold">{sorter.title}</h1>
            {sorter.description && (
              <p className="text-muted-foreground mb-4 text-lg">
                {sorter.description}
              </p>
            )}

            {/* Category Badge */}
            {sorter.category && <Badge>{sorter.category}</Badge>}
          </div>
        </div>

        {/* Creator and Stats Info */}
        <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-1">
            <User size={16} />
            <span>by</span>
            {sorter.creatorUsername ? (
              <Link
                href={`/user/${sorter.creatorUsername}`}
                className="text-foreground font-semibold hover:underline"
              >
                {sorter.creatorUsername}
              </Link>
            ) : (
              <span className="font-medium">Unknown User</span>
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

        {/* Start Sorting Button */}
        <Link href={`/sorter/${sorter.id}/sort`}>
          <Button
            size="lg"
            className="mb-8 transition-transform duration-200 hover:scale-105"
          >
            <Play
              className="mr-2 transition-transform duration-200 group-hover:translate-x-1"
              size={20}
            />
            Sort now
          </Button>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Items to Rank */}
        <div>
          <h2 className="mb-4 text-xl font-bold">
            Items to Rank ({items.length})
          </h2>
          {items.length === 0 ? (
            <p className="text-muted-foreground italic">
              No items found for this sorter.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* Thumbnail */}
                  {item.imageUrl ? (
                    <div className="bg-muted h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                      <span className="text-muted-foreground text-xs">
                        No img
                      </span>
                    </div>
                  )}
                  {/* Item Name */}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Recent Results */}
        <div>
          <h2 className="mb-4 text-xl font-bold">
            Recent Results ({recentResults.length})
          </h2>
          {recentResults.length === 0 ? (
            <p className="text-muted-foreground italic">
              No results yet. Be the first to complete this sorter!
            </p>
          ) : (
            <div className="space-y-4">
              {recentResults.map((result) => (
                <Link
                  key={result.id}
                  href={`/results/${result.id}`}
                  className="block"
                >
                  <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border px-6 py-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
                    {/* Username and Date */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {result.username}
                      </span>
                      <span className="text-muted-foreground text-xs">
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

                    {/* Top 3 Results */}
                    <div className="space-y-2">
                      {result.top3.map((item: any, index: number) => (
                        <div
                          key={item.id || index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {item.imageUrl ? (
                              <div className="bg-muted h-6 w-6 flex-shrink-0 overflow-hidden rounded">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="bg-muted h-6 w-6 flex-shrink-0 rounded"></div>
                            )}
                            <span className="text-muted-foreground truncate">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
