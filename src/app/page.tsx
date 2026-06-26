import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { sorters, user, sortingResults } from "@/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { HeroDuel } from "@/components/hero-duel";
import { ActivityTicker } from "@/components/activity-ticker";
import { PageContainer } from "@/components/ui/page-container";
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

// Latest sorting activity for the ticker — the most recent completed rankings.
async function getRecentActivity() {
  try {
    const rows = await db
      .select({
        title: sortingResults.sorterTitle,
        username: user.username,
        createdAt: sortingResults.createdAt,
      })
      .from(sortingResults)
      .leftJoin(user, eq(sortingResults.userId, user.id))
      .where(isNotNull(sortingResults.sorterTitle))
      .orderBy(desc(sortingResults.createdAt))
      .limit(12);

    const activity = rows.map((r) => ({
      title: r.title ?? "a sorter",
      by: r.username ?? null, // null = anonymous
    }));

    return { activity, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("❌ SSR: Error fetching recent activity:", error);
    throw error;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Sortr - Rank Anything";
  const description = "Pick a favorite, one matchup at a time.";
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
      // OG image comes from the app/opengraph-image.tsx file convention.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Twitter image also comes from the opengraph-image file convention.
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

// Activity changes often; cache briefly so the ticker feels live without
// hammering the DB on every request.
const getRecentActivityCached = unstable_cache(
  getRecentActivity,
  ["homepage-recent-activity"],
  { revalidate: 60 },
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

  // Fetch latest sorting activity for the ticker (non-critical)
  const activityData = (await getRecentActivityCached().catch((error) => {
    console.error("❌ Runtime: Error fetching recent activity:", error);
    return null;
  })) ?? { activity: [] };

  // JSON-LD structured data for homepage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "sortr",
    description:
      "Rank anything by picking a favorite, one matchup at a time.",
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
      <PageContainer className="flex flex-col gap-10 md:gap-12">
        {/* Hero — headline + live featured duel */}
        <HeroDuel />

        {/* Full-bleed ticker — pulled up on mobile to sit closer to the duel */}
        {activityData.activity.length > 0 && (
          <div className="-mt-6 md:mt-0">
            <ActivityTicker items={activityData.activity} />
          </div>
        )}

        {/* Popular sorters (by all-time completions) */}
        <section className="w-full">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="display text-3xl font-black text-foreground md:text-[42px]">
              Popular sorters
            </h2>
            <Link
              href="/browse?sort=popular"
              className="shrink-0 font-mono text-[13px] text-muted-foreground transition-colors hover:text-main-ink"
            >
              view all →
            </Link>
          </div>
          {hadPopularError ? (
            <EmptyState
              variant="error"
              title="Couldn't load these right now."
              description="Refresh to try again."
            />
          ) : popularData.popularSorters.length === 0 ? (
            <EmptyState
              title="No sorters yet."
              description="Be the first — create one."
            />
          ) : (
            <SorterGrid>
              {popularData.popularSorters.map((sorter, i) => (
                <SorterCard
                  key={sorter.id}
                  sorter={sorter}
                  badge={
                    i < 5 ? { label: `#${i + 1}`, tone: "rank" } : undefined
                  }
                />
              ))}
            </SorterGrid>
          )}
        </section>

        {/* Fresh sorters */}
        <section className="w-full">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="display text-3xl font-black text-foreground md:text-[42px]">
              Fresh sorters
            </h2>
            <Link
              href="/browse?sort=recent"
              className="shrink-0 font-mono text-[13px] text-muted-foreground transition-colors hover:text-cyan-ink"
            >
              view all →
            </Link>
          </div>
          {hadRecentError ? (
            <EmptyState
              variant="error"
              title="Couldn't load these right now."
              description="Refresh to try again."
            />
          ) : recentData.recentSorters.length === 0 ? (
            <EmptyState
              title="No sorters yet."
              description="Be the first — create one."
            />
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
