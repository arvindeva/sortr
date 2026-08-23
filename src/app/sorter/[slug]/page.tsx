import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SorterHeaderServer } from "@/components/sorter-header-server";
import { SorterPageClient } from "@/components/sorter-page-client";
import { SorterOwnerControls } from "@/components/sorter-owner-controls";
import { PrivateSorterView } from "@/components/private-sorter-view";
import { getSorterDataCached } from "@/lib/sorter-data";
import { slugForCategory } from "@/lib/categories";
import { getCommunityRankingPoolCount } from "@/lib/community-ranking-data";
import { TrendingSortersSection } from "@/components/trending-sorters-section";
import { ContinueSortingBanner } from "@/components/continue-sorting-banner";

interface SorterPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: SorterPageProps): Promise<Metadata> {
  const { slug } = await params;

  const data = await getSorterDataCached(slug);
  if (!data) {
    return {
      title: "Sorter Not Found",
      description: "The requested sorter could not be found.",
    };
  }

  if (data.sorter.visibility === "private") {
    return {
      title: "Private sorter",
      description: "This sorter is private.",
      robots: { index: false, follow: false },
    };
  }

  const { sorter, items, tags } = data;

  // Title carries the word "Sorter" for search ("<fandom> sorter" queries)
  // unless the creator's own title already says sorter/ranking.
  const title = /sorter|ranking|tier/i.test(sorter.title)
    ? sorter.title
    : `${sorter.title} Sorter`;

  // Create description
  let description = `Rank "${sorter.title}" head-to-head — pick a favorite, one matchup at a time`;
  if (sorter.description) {
    description = sorter.description;
  }
  if (sorter.category) {
    description += ` — ${sorter.category} sorter on sortr`;
  }

  // Count total items
  const itemCount = items.length;

  const fullDescription = `${description}. Sort ${itemCount} items through pairwise comparison and get your personalized ranking.`;
  const baseUrl = (process.env.NEXTAUTH_URL || "https://sortr.io").replace(
    /\/$/,
    "",
  );
  const canonicalUrl = `${baseUrl}/sorter/${slug}`;

  return {
    title,
    description: fullDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: fullDescription,
      type: "website",
      siteName: "sortr",
      url: canonicalUrl,
      // og:image comes from the route's opengraph-image.tsx (the dynamic sorter
      // card). Next injects the file-convention image because this openGraph
      // block doesn't set `images`; twitter:image is auto-filled from it.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: fullDescription,
    },
    ...(data.sorter.visibility === "unlisted"
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

// ISR: the page's server HTML is identical for all visitors (owner-only
// controls are gated client-side via useSession), so it can be cached and
// revalidated rather than re-queried on every request. 1 hour balances
// freshness (content edits) against load at scale.
export const revalidate = 3600;

export default async function SorterPage({ params }: SorterPageProps) {
  const { slug } = await params;

  // Basic sorter validation for 404 (server-side)
  const data = await getSorterDataCached(slug);
  if (!data) {
    notFound();
  }

  if (data.sorter.visibility === "private") {
    // ISR page has no session — render a leak-free shell; the client
    // component fetches through the session-gated API.
    return <PrivateSorterView slug={slug} />;
  }

  // Check if sorter has filters/tags
  const hasFilters = Boolean(data.tags && data.tags.length > 0);

  const createdAtIso =
    data.sorter.createdAt instanceof Date
      ? data.sorter.createdAt.toISOString()
      : data.sorter.createdAt;
  const baseUrl = (process.env.NEXTAUTH_URL || "https://sortr.io").replace(
    /\/$/,
    "",
  );

  // Transform data for client components (convert null to undefined for type safety)
  const transformedSorter = {
    id: data.sorter.id,
    title: data.sorter.title,
    slug: data.sorter.slug,
    userId: data.sorter.userId,
    completionCount: data.sorter.completionCount,
    createdAt:
      data.sorter.createdAt instanceof Date
        ? data.sorter.createdAt.toISOString()
        : data.sorter.createdAt,
    description: data.sorter.description ?? undefined,
    category: data.sorter.category ?? undefined,
    coverImageUrl: data.sorter.coverImageUrl ?? undefined,
    itemCount: data.items.length,
    version: data.sorter.version,
    visibility: data.sorter.visibility,
    user: {
      username: data.sorter.user.username || "Anonymous",
      id: data.sorter.user.id || "",
    },
  };

  const transformedItems = data.items.map((item) => ({
    id: item.id,
    title: item.title,
    imageUrl: item.imageUrl ?? undefined,
    tagSlugs: item.tagSlugs ?? undefined,
  }));

  const transformedTags = data.tags?.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    sortOrder: tag.sortOrder ?? 0,
    items: tag.items.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl ?? undefined,
    })),
  }));

  const initialClientData = {
    sorter: transformedSorter,
    items: transformedItems,
    tags: transformedTags,
    version: data.sorter.version,
  };

  // Breadcrumb trail into the category hub (Home > Category > Sorter) —
  // only when the category has a hub (Other/none stay trail-less).
  const hubSlug = slugForCategory(data.sorter.category);
  const breadcrumbJsonLd = hubSlug
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "sortr", item: baseUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: data.sorter.category,
            item: `${baseUrl}/sorters/${hubSlug}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: data.sorter.title,
            item: `${baseUrl}/sorter/${data.sorter.slug}`,
          },
        ],
      }
    : null;

  // JSON-LD structured data for SEO (server-side)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Survey",
    name: data.sorter.title,
    description: data.sorter.description || `Sorter for "${data.sorter.title}"`,
    url: `${baseUrl}/sorter/${data.sorter.slug}`,
    dateCreated: createdAtIso,
    creator: {
      "@type": "Person",
      name: data.sorter.user.username || "Anonymous",
    },
    about: data.sorter.category || "Ranking",
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: 0,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CompleteAction",
        userInteractionCount: data.sorter.completionCount,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      <main className="container mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Server-rendered Sorter Header */}
        <SorterHeaderServer
          sorter={transformedSorter}
          hasFilters={hasFilters}
          isOwner={false}
        >
          {/* Client-only owner controls injected next to Sort Now */}
          <SorterOwnerControls
            ownerUserId={data.sorter.user.id || ""}
            sorterSlug={data.sorter.slug}
            sorterTitle={data.sorter.title}
          />
        </SorterHeaderServer>

        {/* "Continue where you left off" — shows only if the signed-in user has
            an in-progress sort for this sorter. */}
        <ContinueSortingBanner sorterId={data.sorter.id} slug={data.sorter.slug} />

        {/* Client-side data fetching for items, recent results, and the
            community ranking (fetched client-side so its heavy aggregate never
            blocks the page render). `communityRankingPool` is a cheap
            dedup-aware count: >= MIN renders the section + skeleton, below MIN
            renders the "X of 3 to unlock" locked state. */}
        <SorterPageClient
          slug={slug}
          isOwner={false}
          currentUserEmail={undefined}
          initialData={initialClientData}
          communityRankingPool={await getCommunityRankingPoolCount(
            data.sorter.id,
          )}
        />

        {/* Pull viral visitors deeper: what else is hot right now. */}
        <TrendingSortersSection
          excludeSorterId={data.sorter.id}
          className="mt-16 border-t border-border pt-12"
        />
        <TrendingSortersSection
          window="day"
          excludeSorterId={data.sorter.id}
          className="mt-12"
        />
      </main>
    </>
  );
}
