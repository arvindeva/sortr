import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { user, sorters, sortingResults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

// Force dynamic rendering for always-fresh user statistics
export const dynamic = 'force-dynamic';

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

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;
  const userData = await getUserByUsername(username);

  if (!userData) {
    notFound();
  }

  const userSorters = await getUserSorters(userData.id);
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

  return (
    <main className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
      {/* Profile Header */}
      <UserProfileHeader 
        username={userData.username || ''}
        userSince={userSince}
        isOwnProfile={isOwnProfile}
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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {userSorters.map((sorter) => (
                  <Link
                    key={sorter.id}
                    href={`/sorter/${sorter.slug}`}
                    className="card-link"
                  >
                    <Card className="md:min-h-[180px] cursor-pointer card">
                      <CardHeader className="flex flex-col justify-start md:h-28">
                        <CardTitle className="line-clamp-2 text-lg leading-relaxed">
                          {sorter.title}
                        </CardTitle>
                        {sorter.category && (
                          <Badge variant="default">{sorter.category}</Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-foreground flex items-center justify-between text-sm font-medium">
                          <span>
                            {new Date(sorter.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-3">
                            <span>{sorter.viewCount} views</span>
                            <span>{sorter.completionCount} completions</span>
                          </div>
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

      {/* Rankings Section */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Rankings ({userResults.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {userResults.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="lg">
                  <p className="mb-4 text-lg font-medium">
                    No rankings yet.
                  </p>
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
                    <Card className="md:min-h-[180px] cursor-pointer card">
                      <CardHeader className="flex flex-col justify-start md:h-28">
                        <CardTitle className="line-clamp-2 text-lg leading-relaxed">
                          {result.sorterTitle || "Unknown Sorter"}
                        </CardTitle>
                        {result.sorterCategory && (
                          <Badge variant="default">{result.sorterCategory}</Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-foreground flex items-center justify-between text-sm font-medium">
                          <span>
                            {new Date(result.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-3">
                            <span className="text-muted-foreground">Ranking</span>
                          </div>
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
  );
}
