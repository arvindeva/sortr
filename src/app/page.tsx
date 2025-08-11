import type { Metadata } from "next";
import { Box } from "@/components/ui/box";
import { HomepageClient } from "@/components/homepage-client";
import Link from "next/link";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Server-side data fetching for popular sorters
async function getPopularSorters() {
  try {
    console.log("🏠 SSR: Fetching popular sorters for homepage");

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

    // Transform data to match expected format
    const transformedSorters = popularSorters.map((sorter) => ({
      ...sorter,
      creatorUsername: sorter.creatorUsername ?? "Unknown",
      category: sorter.category ?? undefined,
      coverImageUrl: sorter.coverImageUrl ?? undefined,
    }));

    console.log(`📊 SSR: Found ${transformedSorters.length} popular sorters`);

    return {
      popularSorters: transformedSorters,
      total: transformedSorters.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ SSR: Error fetching popular sorters:", error);
    // Return empty data on error, client-side will handle the error
    return {
      popularSorters: [],
      total: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "sortr - Create a Sorter for Anything";
  const description =
    "Create and share a sorter for anything to rank items from best to worst.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "sortr",
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

export default async function Home() {
  // Fetch popular sorters server-side
  const initialData = await getPopularSorters();

  // JSON-LD structured data for homepage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "sortr",
    description:
      "Create and share a sorter for anything to rank items from best to worst",
    url: process.env.NEXTAUTH_URL || "https://sortr.dev",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/browse?q={search_term_string}`,
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
      <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-2 py-2 md:px-4">
        <section className="mx-auto mb-2 flex max-w-xl justify-center">
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

        {/* Server-rendered data with client-side hydration */}
        <HomepageClient initialData={initialData} />
      </main>
    </>
  );
}
