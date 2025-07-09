import { notFound } from "next/navigation";
import { db } from "@/db";
import { sorters, sorterItems, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, User, Calendar, Eye, Trophy } from "lucide-react";

interface SorterPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getSorterWithItems(sorterId: string) {
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

export default async function SorterPage({ params }: SorterPageProps) {
  const { id } = await params;
  const data = await getSorterWithItems(id);

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
              <p className="text-gray-600 text-lg mb-4">{sorter.description}</p>
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
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
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
        <Button size="lg" className="mb-8">
          <Play className="mr-2" size={20} />
          Start Sorting ({items.length} items)
        </Button>
      </div>

      {/* Items Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Items to Rank ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-gray-500 italic">No items found for this sorter.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="text-center">
                  {item.imageUrl ? (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}