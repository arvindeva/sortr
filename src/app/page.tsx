import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

// Force dynamic rendering for always-fresh data
export const dynamic = 'force-dynamic';

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
    <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-2 py-10 md:px-4">
      <section className="mx-auto mb-10 max-w-xl text-center">
        <h1 className="mb-4 text-6xl font-bold tracking-wide">sortr</h1>
        <p className="text-lg font-medium">
          Create and share ranked lists for anything. Inspired by{" "}
          <Link
            href={`https://execfera.github.io/charasort/`}
            target="_blank"
            className="text-blue-700 underline dark:text-blue-300"
          >
            charasort
          </Link>
          .
        </p>
      </section>
      <section className="w-full">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Popular Sorters</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {popularSorters.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="font-medium">No sorters available yet.</p>
                </Box>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {popularSorters.map((sorter) => (
                  <Card key={sorter.id} className="md:min-h-[160px]">
                    <CardHeader className="flex-1 px-2 md:px-6">
                      <div className="flex-1">
                        <div className="md:h-6rem flex flex-col">
                          <CardTitle className="line-clamp-2 text-xl font-medium">
                            <Link
                              href={`/sorter/${sorter.slug}`}
                              className="hover:underline"
                            >
                              {sorter.title}
                            </Link>
                          </CardTitle>
                          <p className="text-foreground text-sm font-medium">
                            by{" "}
                            <b>
                              <Link
                                href={`/user/${sorter.creatorUsername}`}
                                className="hover:underline"
                              >
                                {sorter.creatorUsername || "Unknown User"}
                              </Link>
                            </b>
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 md:px-6">
                      <div className="text-foreground flex items-center justify-between text-sm font-medium">
                        <div className="flex items-center gap-4">
                          <span>{sorter.completionCount} completions</span>
                          <span>{sorter.viewCount} views</span>
                        </div>
                        {sorter.category && (
                          <Badge variant="default" className="hidden md:block">
                            {sorter.category}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}
