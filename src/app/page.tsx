import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

// Cache statically but revalidate on-demand when completion counts change

async function getPopularSorters() {
  const popularSorters = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      category: sorters.category,
      completionCount: sorters.completionCount,
      viewCount: sorters.viewCount,
      creatorUsername: user.username,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .orderBy(desc(sorters.completionCount))
    .limit(10);

  return popularSorters;
}

export default async function Home() {
  const popularSorters = await getPopularSorters();

  return (
    <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-4 py-10">
      <section className="mx-auto mb-10 max-w-xl text-center">
        <h1 className="mb-4 text-6xl font-bold tracking-wide">sortr</h1>
        <p className="text-muted-foreground text-lg">
          Create and share ranked lists for anything—albums, movies, characters,
          and more. Powered by merge sort.
        </p>
      </section>
      <section className="w-full">
        <h2 className="mb-6 text-2xl font-semibold">Popular Sorters</h2>
        {popularSorters.length === 0 ? (
          <p className="text-muted-foreground text-center italic">
            No sorters available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {popularSorters.map((sorter) => (
              <Link key={sorter.id} href={`/sorter/${sorter.id}`}>
                <Card className="hover:border-primary/50 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
                  <CardHeader>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{sorter.title}</CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        by <b>{sorter.creatorUsername || "Unknown User"}</b>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span>{sorter.completionCount} completions</span>
                        <span>{sorter.viewCount} views</span>
                      </div>
                      {sorter.category && <Badge>{sorter.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
