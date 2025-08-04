import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
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

  // Basic user validation for 404 (server-side)
  const userData = await getUserByUsername(username);
  if (!userData) {
    notFound();
  }

  // Get current session to check ownership
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;
  const isOwnProfile = currentUserEmail === userData.email;

  // JSON-LD structured data for user profile (server-side for SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: userData.username || "Unknown User",
    url: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/user/${userData.username}`,
    ...(userData.image && { image: userData.image }),
    description: `${userData.username}'s sorters on sortr.`,
    mainEntityOfPage: {
      "@type": "ProfilePage",
      name: `${userData.username}'s Profile`,
      description: `View ${userData.username}'s sorters on sortr`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Client-side data fetching and rendering */}
      <UserProfileClient
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserEmail={currentUserEmail || undefined}
      />
    </>
  );
}