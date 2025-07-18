import { RetroCard, RetroCardHeader, RetroCardTitle, RetroCardContent } from "@/components/ui/retro-card";
import { RetroBadge } from "@/components/ui/retro-badge";
import { RetroBox } from "@/components/ui/retro-box";
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
      slug: sorters.slug,
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
        <RetroBox variant="primary" size="xl" shadow="lg" className="mb-6">
          <h1 className="mb-4 text-6xl font-bold tracking-wide">sortr</h1>
          <p className="text-lg font-medium">
            Create and share ranked lists for anything
          </p>
        </RetroBox>
      </section>
      <section className="w-full">
        <RetroBox variant="secondary" size="lg" className="mb-6">
          <h2 className="text-2xl font-semibold">Popular Sorters</h2>
        </RetroBox>
        {popularSorters.length === 0 ? (
          <div className="text-center">
            <RetroBox variant="warning" size="md" shadow="sm">
              <p className="font-medium">
                No sorters available yet.
              </p>
            </RetroBox>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {popularSorters.map((sorter) => (
              <RetroCard key={sorter.id} className="min-h-[160px]">
                <RetroCardHeader>
                  <div className="flex-1">
                    <div className="h-[5rem] flex flex-col">
                      <RetroCardTitle className="text-xl line-clamp-2 mb-2">
                        <Link href={`/sorter/${sorter.slug}`} className="hover:underline">
                          {sorter.title}
                        </Link>
                      </RetroCardTitle>
                      <p className="text-muted-foreground text-sm font-medium">
                        by <b>
                          <Link href={`/user/${sorter.creatorUsername}`} className="hover:underline">
                            {sorter.creatorUsername || "Unknown User"}
                          </Link>
                        </b>
                      </p>
                    </div>
                  </div>
                </RetroCardHeader>
                <RetroCardContent>
                  <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center gap-4">
                      <span>{sorter.completionCount} completions</span>
                      <span>{sorter.viewCount} views</span>
                    </div>
                    {sorter.category && (
                      <RetroBadge variant="default">
                        {sorter.category}
                      </RetroBadge>
                    )}
                  </div>
                </RetroCardContent>
              </RetroCard>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
