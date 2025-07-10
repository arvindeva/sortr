import { notFound } from "next/navigation";
import { db } from "@/db";
import { sortingResults, sorters, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Share2, RotateCcw } from "lucide-react";

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
  };
  sorter: {
    id: string;
    title: string;
    description: string;
    category: string;
    creatorUsername: string;
  };
}

async function getResultData(resultId: string): Promise<ResultData | null> {
  // Get the sorting result
  const resultData = await db
    .select({
      id: sortingResults.id,
      rankings: sortingResults.rankings,
      createdAt: sortingResults.createdAt,
      sorterId: sortingResults.sorterId,
    })
    .from(sortingResults)
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
    },
    sorter: {
      id: sorterData[0].id,
      title: sorterData[0].title,
      description: sorterData[0].description || "",
      category: sorterData[0].category || "",
      creatorUsername: sorterData[0].creatorUsername || "Unknown User",
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
        <Link href={`/sorter/${sorter.id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2" size={16} />
            Back to Sorter
          </Button>
        </Link>
        
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-500" size={24} />
              <h1 className="text-3xl font-bold">Results</h1>
            </div>
            <h2 className="text-xl text-muted-foreground mb-2">{sorter.title}</h2>
            <p className="text-sm text-muted-foreground">
              Completed on {new Date(result.createdAt).toLocaleDateString()} at{" "}
              {new Date(result.createdAt).toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2" size={16} />
              Share
            </Button>
            <Link href={`/sorter/${sorter.id}/sort`}>
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2" size={16} />
                Sort Again
              </Button>
            </Link>
          </div>
        </div>

        {/* Sorter Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>by {sorter.creatorUsername}</span>
          {sorter.category && (
            <>
              <span>•</span>
              <span className="bg-muted px-2 py-1 rounded-full text-xs">
                {sorter.category}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Your Ranking ({result.rankings.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.rankings.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4">
        <Link href={`/sorter/${sorter.id}/sort`}>
          <Button>
            <RotateCcw className="mr-2" size={16} />
            Sort Again
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