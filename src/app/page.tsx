import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Link from "next/link";

// Force dynamic rendering for always-fresh data
export const dynamic = "force-dynamic";

async function getPopularSorters() {
  const popularSorters = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      category: sorters.category,
      completionCount: sorters.completionCount,
      viewCount: sorters.viewCount,
      coverImageUrl: sorters.coverImageUrl,
      creatorUsername: user.username,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(eq(sorters.deleted, false))
    .orderBy(desc(sorters.completionCount))
    .limit(10);

  return popularSorters;
}

export default async function Home() {
  const popularSortersRaw = await getPopularSorters();
  const popularSorters = popularSortersRaw.map((sorter) => ({
    ...sorter,
    creatorUsername: sorter.creatorUsername ?? "Unknown",
    category: sorter.category ?? undefined,
    coverImageUrl: sorter.coverImageUrl ?? undefined,
  }));

  return (
    <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-2 py-10 md:px-4">
      <section className="mx-auto mb-10 flex max-w-xl justify-center">
        <Box variant="primary" size="sm" className="text-center md:p-8">
          <h1 className="text-4xl font-extrabold tracking-wide md:mb-4 md:text-7xl">
            sortr
          </h1>
          <p className="font-medium md:text-lg">
            Create and share ranked lists for anything. <br></br>Inspired by{" "}
            <Link
              href={`https://execfera.github.io/charasort/`}
              target="_blank"
              className="text-blue-800 underline dark:text-blue-800"
            >
              charasort
            </Link>
            .
          </p>
        </Box>
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
              <SorterGrid>
                {popularSorters.map((sorter) => (
                  <SorterCard key={sorter.id} sorter={sorter} />
                ))}
              </SorterGrid>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}
