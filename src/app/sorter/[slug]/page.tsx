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
            {sorter.user.username ? (
              <Link
                href={`/user/${sorter.user.username}`}
                className="text-foreground font-semibold hover:underline"
              >
                {sorter.user.username}
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
        {sorter.useGroups ? (
          <Link href={`/sorter/${sorter.slug}/filters`}>
            <Button
              size="lg"
              className="mb-8 transition-transform duration-200 hover:scale-105"
            >
              <Play
                className="mr-2 transition-transform duration-200 group-hover:translate-x-1"
                size={20}
              />
              Start Sorting
            </Button>
          </Link>
        ) : (
          <Link href={`/sorter/${sorter.slug}/sort`}>
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
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Items to Rank */}
        <div>
          <h2 className="mb-4 text-xl font-bold">
            Items to Rank ({items?.length || 0})
          </h2>
          {sorter.useGroups && groups ? (
            /* Groups Mode */
            groups.length === 0 ? (
              <p className="text-muted-foreground italic">
                No groups found for this sorter.
              </p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    {/* Group Header */}
                    <h3 className="text-primary text-lg font-semibold">
                      {group.name}
                    </h3>

                    {/* Items in Group */}
                    <div className="ml-4 space-y-2">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          {/* Thumbnail */}
                          {item.imageUrl ? (
                            <div className="bg-muted h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                              <span className="text-muted-foreground text-xs font-bold">
                                {item.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Title */}
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm">
                              {item.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : /* Traditional Mode */
          items?.length === 0 ? (
            <p className="text-muted-foreground italic">
              No items found for this sorter.
            </p>
          ) : (
            <div className="space-y-3">
              {items?.map((item) => (
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
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <span className="text-muted-foreground text-xs font-bold">
                        {item.title.charAt(0).toUpperCase()}
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
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs font-bold ${
                              index === 0
                                ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                                : index === 1
                                  ? "border-gray-400 bg-gray-50 text-gray-700"
                                  : "border-amber-600 bg-amber-50 text-amber-700"
                            }`}
                          >
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
                              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                                <span className="text-muted-foreground text-xs font-bold">
                                  {item.title.charAt(0).toUpperCase()}
                                </span>
                              </div>
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
