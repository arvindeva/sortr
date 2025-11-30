import { Metadata } from "next";
import { SorterHeaderServer } from "@/components/sorter-header-server";
import { SorterPageClient } from "@/components/sorter-page-client";
import { SorterNotFound } from "@/components/sorter-not-found";
import { SorterOwnerControls } from "@/components/sorter-owner-controls";
import { getSorterDataCached } from "@/lib/sorter-data";

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
      title: "Sorter Not Found | sortr",
      description: "The requested sorter could not be found.",
    };
  }

  const { sorter, items, tags } = data;

  // Create dynamic title
  const title = sorter.title;

  // Create description
  let description = `Sorter for "${sorter.title}"`;
  if (sorter.description) {
    description = sorter.description;
  }
  if (sorter.category) {
    description += ` - ${sorter.category} sorter on sortr`;
  }

  // Count total items
  const itemCount = items.length;

  const fullDescription = `${description}. Sort ${itemCount} items through pairwise comparison and create your personalized results.`;
  const baseUrl = process.env.NEXTAUTH_URL || "https://sortr.io";
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
      images: [
        {
          url: "/og-sorter.png", // We'll create this later
          width: 1200,
          height: 630,
          alt: `${sorter.title} - Ranking sorter`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: fullDescription,
      images: ["/og-sorter.png"],
    },
  };
}

export default async function SorterPage({ params }: SorterPageProps) {
  const { slug } = await params;

  // Basic sorter validation for 404 (server-side)
  const data = await getSorterDataCached(slug);
  if (!data) {
    return <SorterNotFound slug={slug} />;
  }

  // Check if sorter has filters/tags
  const hasFilters = Boolean(data.tags && data.tags.length > 0);

  const createdAtIso =
    data.sorter.createdAt instanceof Date
      ? data.sorter.createdAt.toISOString()
      : data.sorter.createdAt;
  const baseUrl = process.env.NEXTAUTH_URL || "https://sortr.io";

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
    version: data.sorter.version,
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
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
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

        {/* Client-side data fetching for items and recent results */}
        <SorterPageClient
          slug={slug}
          isOwner={false}
          currentUserEmail={undefined}
          initialData={initialClientData}
        />
      </main>
    </>
  );
}
