import { Metadata } from "next";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { SorterHeaderServer } from "@/components/sorter-header-server";
import { SorterPageClient } from "@/components/sorter-page-client";
import { SorterNotFound } from "@/components/sorter-not-found";
import { SorterOwnerControls } from "@/components/sorter-owner-controls";

// Cache sorter detail pages for 1 hour - content rarely changes
export const revalidate = 3600;

interface SorterPageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface SorterData {
  sorter: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    coverImageUrl?: string;
    userId: string;
    createdAt: string;
    completionCount: number;
    viewCount: number;
    user: {
      username: string;
      id: string;
    };
  };
  items: any[];
  tags?: any[];
}

export async function generateMetadata({
  params,
}: SorterPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Get sorter data for metadata (without incrementing view count)
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sorters/${slug}`,
  );
  if (!response.ok) {
    return {
      title: "Sorter Not Found | sortr",
      description: "The requested sorter could not be found.",
    };
  }

  const data: SorterData = await response.json();
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

async function getSorterWithItems(
  sorterSlug: string,
): Promise<SorterData | null> {
  // First get the sorter ID and deleted status from slug
  const sorterIdQuery = await db
    .select({ id: sorters.id, deleted: sorters.deleted })
    .from(sorters)
    .where(eq(sorters.slug, sorterSlug))
    .limit(1);

  if (sorterIdQuery.length === 0) {
    return null;
  }

  const sorter = sorterIdQuery[0];

  // Only increment view count for non-deleted sorters
  if (!sorter.deleted) {
    await db
      .update(sorters)
      .set({ viewCount: sql`${sorters.viewCount} + 1` })
      .where(eq(sorters.id, sorter.id));
  }

  // Use the API endpoint to get sorter data with groups support
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sorters/${sorterSlug}`,
    { next: { revalidate: 300 } } // Cache for 5 minutes
  );
  if (!response.ok) {
    return null;
  }

  const data: SorterData = await response.json();
  return data;
}

export default async function SorterPage({ params }: SorterPageProps) {
  const { slug } = await params;

  // Basic sorter validation for 404 (server-side)
  const data = await getSorterWithItems(slug);
  if (!data) {
    return <SorterNotFound slug={slug} />;
  }

  // Check if sorter has filters/tags
  const hasFilters = Boolean(data.tags && data.tags.length > 0);

  // JSON-LD structured data for SEO (server-side)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Survey",
    name: data.sorter.title,
    description: data.sorter.description || `Sorter for "${data.sorter.title}"`,
    url: `${process.env.NEXTAUTH_URL}/sorter/${data.sorter.slug}`,
    dateCreated: data.sorter.createdAt,
    creator: {
      "@type": "Person",
      name: data.sorter.user.username || "Anonymous",
    },
    about: data.sorter.category || "Ranking",
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: data.sorter.viewCount,
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
          sorter={data.sorter}
          hasFilters={hasFilters}
          isOwner={false}
        >
          {/* Client-only owner controls injected next to Sort Now */}
          <SorterOwnerControls
            ownerUserId={data.sorter.user.id}
            sorterSlug={data.sorter.slug}
            sorterTitle={data.sorter.title}
          />
        </SorterHeaderServer>

        {/* Client-side data fetching for items and recent results */}
        <SorterPageClient
          slug={slug}
          isOwner={false}
          currentUserEmail={undefined}
        />
      </main>
    </>
  );
}
