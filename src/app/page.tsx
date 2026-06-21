import type { Metadata } from "next";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { HeroDuel } from "@/components/hero-duel";
import { PageContainer } from "@/components/ui/page-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";

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
      .where(and(eq(sorters.deleted, false), eq(sorters.status, "active")))
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
      .where(and(eq(sorters.deleted, false), eq(sorters.status, "active")))
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
      <PageContainer className="flex flex-col gap-12">
        {/* Hero Section - interactive duel */}
        <HeroDuel />

        {/* Pure server-rendered popular sorters */}
        <section className="w-full">
          <SectionHeading>Popular Sorters</SectionHeading>
          {hadPopularError ? (
            <EmptyState
              variant="error"
              title="Failed to load popular sorters."
              description="Please try again."
            />
          ) : popularData.popularSorters.length === 0 ? (
            <EmptyState title="No sorters available yet." />
          ) : (
            <SorterGrid>
              {popularData.popularSorters.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          )}
        </section>

        {/* Pure server-rendered recent sorters */}
        <section className="w-full">
          <SectionHeading>Recent Sorters</SectionHeading>
          {hadRecentError ? (
            <EmptyState
              variant="error"
              title="Failed to load recent sorters."
              description="Please try again."
            />
          ) : recentData.recentSorters.length === 0 ? (
            <EmptyState title="No sorters available yet." />
          ) : (
            <SorterGrid>
              {recentData.recentSorters.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          )}
        </section>
      </PageContainer>
    </>
  );
}
