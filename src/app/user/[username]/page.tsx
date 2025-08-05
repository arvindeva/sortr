import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { user, sorters, sortingResults } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { UserProfileHeaderServer } from "@/components/user-profile-header-server";
import { UserProfileClient } from "@/components/user-profile-client";

interface UserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Server-side user lookup for metadata and 404 handling
async function getUserByUsername(username: string) {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  return users[0] || null;
}

// Server-side complete user profile data fetching
async function getUserProfileData(username: string) {
  // Handle anonymous user case
  if (username === "Anonymous" || username === "Unknown User") {
    return null;
  }

  // Get user by username
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  const userData = users[0];
  if (!userData) {
    return null;
  }

  // Get user stats in parallel
  const [sorterCountResult, rankingCountResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(sorters)
      .where(and(eq(sorters.userId, userData.id), eq(sorters.deleted, false))),
    db
      .select({ count: count() })
      .from(sortingResults)
      .where(eq(sortingResults.userId, userData.id))
  ]);

  const sorterCount = sorterCountResult[0].count;
  const rankingCount = rankingCountResult[0].count;

  // Get user's sorters
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
    .where(and(eq(sorters.userId, userData.id), eq(sorters.deleted, false)))
    .orderBy(desc(sorters.createdAt));

  // Get user's rankings
  const userResults = await db
    .select({
      id: sortingResults.id,
      sorterId: sortingResults.sorterId,
      rankings: sortingResults.rankings,
      createdAt: sortingResults.createdAt,
      sorterTitle: sorters.title,
      sorterSlug: sorters.slug,
      sorterCategory: sorters.category,
    })
    .from(sortingResults)
    .leftJoin(sorters, eq(sortingResults.sorterId, sorters.id))
    .where(eq(sortingResults.userId, userData.id))
    .orderBy(desc(sortingResults.createdAt));

  // Transform sorters data
  const transformedSorters = userSorters.map((sorter) => ({
    ...sorter,
    creatorUsername: userData.username || "Unknown",
    coverImageUrl: sorter.coverImageUrl ?? undefined,
    category: sorter.category ?? undefined,
  }));

  // Transform rankings data to include top 3 for previews
  const transformedResults = userResults.map((result) => {
    let rankings = [];
    let top3 = [];
    
    try {
      rankings = JSON.parse(result.rankings);
      top3 = rankings.slice(0, 3);
    } catch (error) {
      console.error("Failed to parse rankings:", error);
    }

    return {
      id: result.id,
      sorterId: result.sorterId,
      rankings: result.rankings, // Keep original JSON string
      top3, // Parsed top 3 for preview
      createdAt: result.createdAt,
      sorterTitle: result.sorterTitle || "Unknown Sorter",
      sorterSlug: result.sorterSlug,
      sorterCategory: result.sorterCategory,
    };
  });

  const userSince = new Date(
    userData.emailVerified || new Date(),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return {
    user: {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      image: userData.image,
      emailVerified: userData.emailVerified,
    },
    stats: {
      sorterCount,
      rankingCount,
    },
    sorters: transformedSorters,
    rankings: transformedResults,
    userSince,
  };
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

    const title = `${username}'s Profile`;
    const description = `View ${username}'s sorters on sortr.`;

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

  // Get complete user profile data server-side
  const profileData = await getUserProfileData(username);
  if (!profileData) {
    notFound();
  }

  // Get current session to check ownership
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;
  const isOwnProfile = currentUserEmail === profileData.user.email;

  // JSON-LD structured data for user profile (server-side for SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profileData.user.username || "Unknown User",
    url: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/user/${profileData.user.username}`,
    ...(profileData.user.image && { image: profileData.user.image }),
    description: `${profileData.user.username}'s sorters on sortr.`,
    mainEntityOfPage: {
      "@type": "ProfilePage",
      name: `${profileData.user.username}'s Profile`,
      description: `View ${profileData.user.username}'s sorters on sortr`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
        {/* Server-rendered Profile Header */}
        <UserProfileHeaderServer
          username={profileData.user.username || ""}
          userSince={profileData.userSince}
          isOwnProfile={isOwnProfile}
          currentImage={profileData.user.image}
        />
        
        {/* Client-side data fetching for sorters and rankings */}
        <UserProfileClient
          username={username}
          isOwnProfile={isOwnProfile}
          currentUserEmail={currentUserEmail || undefined}
          initialData={profileData}
        />
      </main>
    </>
  );
}