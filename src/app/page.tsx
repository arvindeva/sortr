import type { Metadata } from "next";
import { Box } from "@/components/ui/box";
import Link from "next/link";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";

// Server-side data fetching for popular sorters
async function getPopularSorters() {
  const numberOfPopularSorters = 20;

  try {
    const popularSorters = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        slug: sorters.slug,
        category: sorters.category,
        completionCount: sorters.completionCount,
        coverImageUrl: sorters.coverImageUrl,
        creatorUsername: user.username,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(eq(sorters.deleted, false))
      .orderBy(desc(sorters.completionCount))
      .limit(numberOfPopularSorters);

    // Transform data to match expected format
    const transformedSorters = popularSorters.map((sorter) => ({
      ...sorter,
      creatorUsername: sorter.creatorUsername ?? "Unknown",
      category: sorter.category ?? undefined,
      coverImageUrl: sorter.coverImageUrl ?? undefined,
    }));

    return {
      popularSorters: transformedSorters,
      total: transformedSorters.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Let ISR keep serving the previous page instead of caching an empty state
    console.error("❌ SSR: Error fetching popular sorters:", error);
    throw error;
  }
}

// Server-side data fetching for recent sorters
async function getRecentSorters() {
  const numberOfRecentSorters = 20;

  try {
    const recentSorters = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        slug: sorters.slug,
        category: sorters.category,
        completionCount: sorters.completionCount,
        coverImageUrl: sorters.coverImageUrl,
        creatorUsername: user.username,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(eq(sorters.deleted, false))
      .orderBy(desc(sorters.createdAt))
      .limit(numberOfRecentSorters);

    // Transform data to match expected format
    const transformedSorters = recentSorters.map((sorter) => ({
      ...sorter,
      creatorUsername: sorter.creatorUsername ?? "Unknown",
      category: sorter.category ?? undefined,
      coverImageUrl: sorter.coverImageUrl ?? undefined,
    }));

    return {
      recentSorters: transformedSorters,
      total: transformedSorters.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ SSR: Error fetching recent sorters:", error);
    throw error;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "sortr - Create a Sorter for Anything";
  const description =
    "Create and share a sorter for anything to rank items from best to worst.";
  const baseUrl = process.env.NEXTAUTH_URL || "https://sortr.io";

  return {
    title,
    description,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "sortr",
      url: baseUrl,
      images: [
        {
          url: "/og-home.png",
          width: 1200,
          height: 630,
          alt: "sortr - Create and share a sorter for anything",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-home.png"],
    },
  };
}

// Cache the homepage data at runtime (avoid DB lookups during build)
const getPopularSortersCached = unstable_cache(
  getPopularSorters,
  ["homepage-popular-sorters"],
  { revalidate: 300 },
);

const getRecentSortersCached = unstable_cache(
  getRecentSorters,
  ["homepage-recent-sorters"],
  { revalidate: 300 },
);

// Avoid build-time prerender failures when the DB host isn't reachable in the build container
export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch popular sorters server-side; on failure, keep page up with a friendly message
  const popularData = (await getPopularSortersCached().catch((error) => {
    console.error("❌ Runtime: Error fetching popular sorters:", error);
    return null;
  })) ?? {
    popularSorters: [],
    total: 0,
    timestamp: new Date().toISOString(),
    __error: true,
  };
  const hadPopularError = (popularData as any).__error === true;

  // Fetch recent sorters server-side
  const recentData = (await getRecentSortersCached().catch((error) => {
    console.error("❌ Runtime: Error fetching recent sorters:", error);
    return null;
  })) ?? {
    recentSorters: [],
    total: 0,
    timestamp: new Date().toISOString(),
    __error: true,
  };
  const hadRecentError = (recentData as any).__error === true;

  // JSON-LD structured data for homepage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "sortr",
    description:
      "Create and share a sorter for anything to rank items from best to worst",
    url: process.env.NEXTAUTH_URL || "https://sortr.io",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXTAUTH_URL || "https://sortr.io"}/browse?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col gap-8 px-2 py-2 md:px-4">
        <section className="mx-auto flex max-w-xl justify-center">
          <Box
            variant="primary"
            size="sm"
            className="my-2 text-center sm:my-8 md:p-8"
          >
            <h1 className="text-4xl font-extrabold tracking-wide md:mb-4 md:text-7xl">
              sortr
            </h1>
            <p className="mb-2 text-lg font-bold md:mb-4 md:text-xl">
              Create a Sorter for Anything
            </p>
            <p className="font-medium md:text-lg">
              Inspired by{" "}
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

        {/* Pure server-rendered popular sorters */}
        <section className="w-full">
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Popular Sorters</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              {hadPopularError ? (
                <div className="text-center">
                  <Box variant="warning" size="md">
                    <p className="font-medium">
                      Failed to load popular sorters. Please try again.
                    </p>
                  </Box>
                </div>
              ) : popularData.popularSorters.length === 0 ? (
                <div className="text-center">
                  <Box variant="warning" size="md">
                    <p className="font-medium">No sorters available yet.</p>
                  </Box>
                </div>
              ) : (
                <SorterGrid>
                  {popularData.popularSorters.map((sorter) => (
                    <SorterCard key={sorter.id} sorter={sorter} />
                  ))}
                </SorterGrid>
              )}
            </PanelContent>
          </Panel>
        </section>

        {/* Pure server-rendered recent sorters */}
        <section className="w-full">
          <Panel variant="primary">
            <PanelHeader variant="primary">
              <PanelTitle>Recent Sorters</PanelTitle>
            </PanelHeader>
            <PanelContent variant="primary" className="p-2 md:p-6">
              {hadRecentError ? (
                <div className="text-center">
                  <Box variant="warning" size="md">
                    <p className="font-medium">
                      Failed to load recent sorters. Please try again.
                    </p>
                  </Box>
                </div>
              ) : recentData.recentSorters.length === 0 ? (
                <div className="text-center">
                  <Box variant="warning" size="md">
                    <p className="font-medium">No sorters available yet.</p>
                  </Box>
                </div>
              ) : (
                <SorterGrid>
                  {recentData.recentSorters.map((sorter) => (
                    <SorterCard key={sorter.id} sorter={sorter} />
                  ))}
                </SorterGrid>
              )}
            </PanelContent>
          </Panel>
        </section>
      </main>
    </>
  );
}
