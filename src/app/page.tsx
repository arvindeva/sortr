import type { Metadata } from "next";
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
import { eq, desc, and, count } from "drizzle-orm";
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

async function getSorterStats() {
  const [sorterCount] = await db
    .select({ count: count() })
    .from(sorters)
    .where(eq(sorters.deleted, false));

  return sorterCount.count;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const sorterCount = await getSorterStats();

    const title = "sortr - Create a Sorter for Anything";
    const description =
      "Create and share a sorter for anything to rank items from best to worst.";

    return {
      title: {
        absolute: title, // Use absolute to override the template
      },
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
            alt: "sortr - Create and share ranked lists",
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
  } catch (error) {
    console.error("Error generating homepage metadata:", error);
    return {
      title: {
        absolute: "sortr - Create a Sorter for Anything",
      },
      description:
        "Create and share a sorter for anything to rank items from best to worst.",
      openGraph: {
        title: "sortr - Create a Sorter for Anything",
        description:
          "Create and share a sorter for anything to rank items from best to worst.",
        type: "website",
        siteName: "sortr",
        images: ["/og-home.png"],
      },
      twitter: {
        card: "summary_large_image",
        title: "sortr - Create a Sorter for Anything",
        description:
          "Create and share a sorter for anything to rank items from best to worst.",
        images: ["/og-home.png"],
      },
    };
  }
}

export default async function Home() {
  const popularSortersRaw = await getPopularSorters();
  const popularSorters = popularSortersRaw.map((sorter) => ({
    ...sorter,
    creatorUsername: sorter.creatorUsername ?? "Unknown",
    category: sorter.category ?? undefined,
    coverImageUrl: sorter.coverImageUrl ?? undefined,
  }));

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
    mainEntity: {
      "@type": "ItemList",
      name: "Popular Sorters",
      description: "Most popular sorters on sortr",
      numberOfItems: popularSorters.length,
      itemListElement: popularSorters.slice(0, 5).map((sorter, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Survey",
          name: sorter.title,
          description: `Sorter for ${sorter.title}`,
          url: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/sorter/${sorter.slug}`,
          about: sorter.category || "Ranking",
          interactionStatistic: [
            {
              "@type": "InteractionCounter",
              interactionType: "https://schema.org/ViewAction",
              userInteractionCount: sorter.viewCount,
            },
            {
              "@type": "InteractionCounter",
              interactionType: "https://schema.org/CompleteAction",
              userInteractionCount: sorter.completionCount,
            },
          ],
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-2 py-10 md:px-4">
        <section className="mx-auto mb-10 flex max-w-xl justify-center">
          <Box variant="primary" size="sm" className="text-center md:p-8">
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
    </>
  );
}
