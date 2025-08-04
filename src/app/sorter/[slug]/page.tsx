import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { SorterPageClient } from "@/components/sorter-page-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trophy, Pencil } from "lucide-react";
import { DeleteSorterButton } from "@/components/delete-sorter-button";
import Link from "next/link";

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

  return {
    title,
    description: fullDescription,
    openGraph: {
      title,
      description: fullDescription,
      type: "website",
      siteName: "sortr",
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
    notFound();
  }

  // Get current session to check ownership (server-side)
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  // Check if current user is the owner
  let isOwner = false;
  if (currentUserEmail && data.sorter.user?.id) {
    const userData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, currentUserEmail))
      .limit(1);

    isOwner = userData.length > 0 && userData[0].id === data.sorter.user.id;
  }

  const { sorter, tags } = data;
  
  // Determine if filtering is needed (tags exist)
  const hasFilters = tags && tags.length > 0;

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
        <section className="mb-3">
          <div className="flex items-center space-x-3 py-4 md:space-x-6">
            {/* Cover Image */}
            <div className="border-border rounded-base flex h-28 w-28 items-center justify-center overflow-hidden border-2 md:h-48 md:w-48">
              {sorter.coverImageUrl ? (
                <img
                  src={sorter.coverImageUrl}
                  alt={`${sorter.title}'s cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
                  <span className="text-4xl font-bold">
                    {sorter.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Sorter Info */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <PageHeader>{sorter.title}</PageHeader>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
                <div className="flex items-center gap-1">
                  <span>by</span>
                  {sorter.user.username ? (
                    <Link
                      href={`/user/${sorter.user.username}`}
                      className="font-bold hover:underline"
                    >
                      {sorter.user.username}
                    </Link>
                  ) : (
                    <span className="font-bold">Unknown User</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Trophy size={16} />
                  <span>{sorter.completionCount}</span>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="mt-4 hidden items-center gap-4 md:flex">
                {hasFilters ? (
                  <Button
                    asChild
                    size="default"
                    variant="default"
                    className="group"
                  >
                    <Link href={`/sorter/${sorter.slug}/filters`}>
                      <Play
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        size={20}
                      />
                      Sort Now
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="default"
                    variant="default"
                    className="group"
                  >
                    <Link href={`/sorter/${sorter.slug}/sort`}>
                      <Play
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        size={20}
                      />
                      Sort now
                    </Link>
                  </Button>
                )}

                {/* Edit Button - Only show for sorter owner */}
                {isOwner && (
                  <Button asChild variant="neutral">
                    <Link href={`/sorter/${sorter.slug}/edit`}>
                      <Pencil className="mr-2" size={16} />
                      Edit
                    </Link>
                  </Button>
                )}

                {/* Delete Button - Only show for sorter owner */}
                {isOwner && (
                  <DeleteSorterButton
                    sorterSlug={sorter.slug}
                    sorterTitle={sorter.title}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Action Buttons */}
        <div className="mb-8 flex items-center gap-4 md:hidden">
          {hasFilters ? (
            <Button asChild size="default" variant="default" className="group">
              <Link href={`/sorter/${sorter.slug}/filters`}>
                <Play
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort Now
              </Link>
            </Button>
          ) : (
            <Button asChild size="default" variant="default" className="group">
              <Link href={`/sorter/${sorter.slug}/sort`}>
                <Play
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort now
              </Link>
            </Button>
          )}

          {/* Edit Button - Only show for sorter owner */}
          {isOwner && (
            <Button asChild variant="neutral">
              <Link href={`/sorter/${sorter.slug}/edit`}>
                <Pencil className="mr-2" size={16} />
                Edit
              </Link>
            </Button>
          )}

          {/* Delete Button - Only show for sorter owner */}
          {isOwner && (
            <DeleteSorterButton
              sorterSlug={sorter.slug}
              sorterTitle={sorter.title}
            />
          )}
        </div>

        {/* Client-side content for items, tags, and recent rankings */}
        <SorterPageClient
          slug={slug}
          isOwner={isOwner}
          currentUserEmail={currentUserEmail || undefined}
        />
      </main>
    </>
  );
}
