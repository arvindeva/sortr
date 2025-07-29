import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { user, sorters, sortingResults } from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { authOptions } from "@/lib/auth";
import { UserProfileHeader } from "@/components/user-profile-header";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { Eye, Trophy } from "lucide-react";
import { getImageUrl } from "@/lib/image-utils";

// Force dynamic rendering for always-fresh user statistics
export const dynamic = "force-dynamic";

interface UserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getUserByUsername(username: string) {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  return users[0] || null;
}

async function getUserSorters(userId: string) {
  const userSorters = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      description: sorters.description,
      category: sorters.category,
      createdAt: sorters.createdAt,
      completionCount: sorters.completionCount,
      viewCount: sorters.viewCount,
      coverImageUrl: sorters.coverImageUrl,
    })
    .from(sorters)
    .where(and(eq(sorters.userId, userId), eq(sorters.deleted, false)))
    .orderBy(desc(sorters.createdAt));

  return userSorters;
}

async function getUserResults(userId: string) {
  const userResults = await db
    .select({
      id: sortingResults.id,
      sorterId: sortingResults.sorterId,
      rankings: sortingResults.rankings,
      selectedGroups: sortingResults.selectedGroups,
      createdAt: sortingResults.createdAt,
      sorterTitle: sorters.title,
      sorterSlug: sorters.slug,
      sorterCategory: sorters.category,
    })
    .from(sortingResults)
    .leftJoin(sorters, eq(sortingResults.sorterId, sorters.id))
    .where(eq(sortingResults.userId, userId))
    .orderBy(desc(sortingResults.createdAt));

  return userResults;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  // Handle anonymous user case
  if (username === "Anonymous" || username === "Unknown User") {
    return {
      title: "User Not Found | sortr",
      description: "The requested user profile could not be found.",
    };
  }

  try {
    const userData = await getUserByUsername(username);

    if (!userData) {
      return {
        title: "User Not Found | sortr",
        description: "The requested user profile could not be found.",
      };
    }

    // Get user stats
    const [sorterCount] = await db
      .select({ count: count() })
      .from(sorters)
      .where(and(eq(sorters.userId, userData.id), eq(sorters.deleted, false)));

    const [rankingCount] = await db
      .select({ count: count() })
      .from(sortingResults)
      .where(eq(sortingResults.userId, userData.id));

    const title = `${username}'s Profile`;
    const description = `View ${username}'s sorters on sortr. ${sorterCount.count} sorters created, ${rankingCount.count} rankings completed.`;

    const userSince = new Date(
      userData.emailVerified || new Date(),
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        siteName: "sortr",
        images: [
          {
            url: "/og-user.png",
            width: 1200,
            height: 630,
            alt: `${username}'s Profile on sortr`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-user.png"],
      },
    };
  } catch (error) {
    console.error("Error generating user metadata:", error);
    return {
      title: `${username}'s Profile`,
      description: `View ${username}'s sorters on sortr.`,
    };
  }
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;

  // Handle anonymous user case
  if (username === "Anonymous" || username === "Unknown User") {
    notFound();
  }

  const userData = await getUserByUsername(username);

  if (!userData) {
    notFound();
  }

  const userSortersRaw = await getUserSorters(userData.id);
  const userSorters = userSortersRaw.map((sorter) => ({
    ...sorter,
    creatorUsername: userData.username || "Unknown",
    coverImageUrl: sorter.coverImageUrl ?? undefined,
    category: sorter.category ?? undefined,
  }));
  const userResults = await getUserResults(userData.id);

  // Get current session to check if this is the current user's profile
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUserEmail === userData.email;

  const userSince = new Date(
    userData.emailVerified || new Date(),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Use image URL directly from database
  const currentImage = userData.image;

  // JSON-LD structured data for user profile
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: userData.username || "Unknown User",
    url: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/user/${userData.username}`,
    ...(currentImage && { image: currentImage }),
    description: `${userData.username}'s sorters on sortr. Created ${userSorters.length} sorters and completed ${userResults.length} rankings.`,
    mainEntityOfPage: {
      "@type": "ProfilePage",
      name: `${userData.username}'s Profile`,
      description: `View ${userData.username}'s sorters on sortr`,
    },
    ...(userSorters.length > 0 && {
      hasOccupation: {
        "@type": "Role",
        hasOccupation: {
          "@type": "Occupation",
          name: "Content Creator",
          description: "Creates sorters on sortr",
        },
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
      {/* Profile Header */}
      <UserProfileHeader
        username={userData.username || ""}
        userSince={userSince}
        isOwnProfile={isOwnProfile}
        currentImage={currentImage}
      />
      {/* Sorters Section */}
      <section className="mb-8">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Sorters ({userSorters.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {userSorters.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="lg">
                  <p className="mb-4 text-lg font-medium">
                    No sorters created yet.
                  </p>
                  <p className="font-medium">
                    Start creating sorters to share with others!
                  </p>
                </Box>
              </div>
            ) : (
              <SorterGrid>
                {userSorters.map((sorter) => (
                  <SorterCard key={sorter.id} sorter={sorter} />
                ))}
              </SorterGrid>
            )}
          </PanelContent>
        </Panel>
      </section>

      {/* Rankings Section */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Rankings ({userResults.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {userResults.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="mb-4 font-medium">No rankings yet.</p>
                  <p className="font-medium">
                    Complete some sorting sessions to see rankings!
                  </p>
                </Box>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {userResults.map((result) => (
                  <Link
                    key={result.id}
                    href={`/rankings/${result.id}`}
                    className="card-link"
                  >
                    <Card className="card cursor-pointer gap-2 md:min-h-[180px]">
                      <CardHeader className="flex flex-col justify-start">
                        <CardTitle className="line-clamp-2 leading-relaxed">
                          {result.sorterTitle || "Unknown Sorter"}
                        </CardTitle>
                        {result.sorterCategory && (
                          <Badge variant="default">
                            {result.sorterCategory}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Top 3 Rankings Preview */}
                        <div className="mb-3 space-y-2">
                          {(() => {
                            let rankings = [];
                            try {
                              rankings = JSON.parse(result.rankings);
                            } catch (error) {
                              console.error("Failed to parse rankings:", error);
                            }
                            const top3 = rankings.slice(0, 3);
                            return top3.map((item: any, index: number) => (
                              <div
                                key={item.id || index}
                                className="flex items-center gap-2"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {item.imageUrl ? (
                                    <div className="border-border rounded-base h-6 w-6 flex-shrink-0 overflow-hidden border-2">
                                      <img
                                        src={getImageUrl(
                                          item.imageUrl,
                                          "thumbnail",
                                        )}
                                        alt={item.title}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="border-border bg-secondary-background rounded-base flex h-6 w-6 flex-shrink-0 items-center justify-center border-2">
                                      <span className="text-main text-xs font-bold">
                                        {item.title.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="min-w-[1.5rem] text-center font-bold">
                                    {index + 1}.
                                  </span>
                                  <span className="font-medium break-words">
                                    {item.title}
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
    </>
  );
}
