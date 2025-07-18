import { notFound } from "next/navigation";
import { db } from "@/db";
import { user, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/ui/retro-card";
import { RetroBadge } from "@/components/ui/retro-badge";
import { RetroBox } from "@/components/ui/retro-box";

// Cache statically but revalidate on-demand when completion counts change

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
    })
    .from(sorters)
    .where(eq(sorters.userId, userId))
    .orderBy(desc(sorters.createdAt));

  return userSorters;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;
  const userData = await getUserByUsername(username);

  if (!userData) {
    notFound();
  }

  const userSorters = await getUserSorters(userData.id);

  const userSince = new Date(
    userData.emailVerified || new Date(),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Profile Header */}
      <section className="mb-8">
        <RetroBox variant="primary" size="lg" className="flex items-center space-x-6">
          {/* Avatar Placeholder */}
          <div className="flex h-24 w-24 items-center justify-center bg-black text-yellow-300 border-2 border-black">
            <span className="text-2xl font-bold">
              {userData.username?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Info */}
          <div>
            <h1 className="mb-2 text-3xl font-bold">{userData.username}</h1>
            <p className="text-lg font-medium">User since {userSince}</p>
          </div>
        </RetroBox>
      </section>

      {/* Sorters Section */}
      <section>
        <RetroBox variant="secondary" size="lg" className="mb-6">
          <h2 className="text-2xl font-bold">Sorters ({userSorters.length})</h2>
        </RetroBox>

        {userSorters.length === 0 ? (
          <div className="text-center">
            <RetroBox variant="warning" size="lg">
              <p className="mb-4 text-lg font-medium">
                No sorters created yet.
              </p>
              <p className="font-medium">
                Start creating sorters to share with others!
              </p>
            </RetroBox>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userSorters.map((sorter) => (
              <RetroCard key={sorter.id} className="min-h-[180px]">
                <RetroCardHeader className="flex h-28 flex-col justify-start pb-3">
                  <RetroCardTitle className="mb-3 line-clamp-2 text-lg leading-relaxed">
                    <Link href={`/sorter/${sorter.slug}`} className="hover:underline">
                      {sorter.title}
                    </Link>
                  </RetroCardTitle>
                  {sorter.category && (
                    <RetroBadge variant="default">
                      {sorter.category}
                    </RetroBadge>
                  )}
                </RetroCardHeader>
                <RetroCardContent>
                  <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
                    <span>
                      {new Date(sorter.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-3">
                      <span>{sorter.viewCount} views</span>
                      <span>{sorter.completionCount} completions</span>
                    </div>
                  </div>
                </RetroCardContent>
              </RetroCard>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
