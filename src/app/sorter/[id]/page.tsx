import { notFound } from "next/navigation";
import { db } from "@/db";
import { sorters, sorterItems, sortingResults, user } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  return recentResults.map(result => {
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
    getRecentResults(id)
  ]);

  if (!data) {
    notFound();
  }

  const { sorter, items } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Sorter Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{sorter.title}</h1>
            {sorter.description && (
              <p className="text-muted-foreground text-lg mb-4">{sorter.description}</p>
            )}

            {/* Category Badge */}
            {sorter.category && (
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {sorter.category}
              </span>
            )}
          </div>
        </div>

        {/* Creator and Stats Info */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1">
            <User size={16} />
            <span>by</span>
            {sorter.creatorUsername ? (
              <Link
                href={`/user/${sorter.creatorUsername}`}
                className="font-medium text-blue-600 hover:underline"
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
          <Button size="lg" className="mb-8">
            <Play className="mr-2" size={20} />
            Sort now
          </Button>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Items to Rank */}
        <div>
          <h2 className="text-xl font-bold mb-4">Items to Rank ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-muted-foreground italic">No items found for this sorter.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* Thumbnail */}
                  {item.imageUrl ? (
                    <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No img</span>
                    </div>
                  )}
                  {/* Item Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
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
          <h2 className="text-xl font-bold mb-4">Recent Results ({recentResults.length})</h2>
          {recentResults.length === 0 ? (
            <p className="text-muted-foreground italic">No results yet. Be the first to complete this sorter!</p>
          ) : (
            <div className="space-y-4">
              {recentResults.map((result) => (
                <Link key={result.id} href={`/results/${result.id}`} className="block">
                  <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow hover:border-primary/50 px-6 py-4">
                    {/* Username and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">{result.username}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(result.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    {/* Top 3 Results */}
                    <div className="space-y-2">
                      {result.top3.map((item: any, index: number) => (
                        <div key={item.id || index} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.imageUrl ? (
                              <div className="w-6 h-6 bg-muted rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-muted rounded flex-shrink-0"></div>
                            )}
                            <span className="truncate text-muted-foreground">{item.title}</span>
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