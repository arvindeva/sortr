import { notFound } from "next/navigation";
import { db } from "@/db";
import { user, sorters } from "@/db/schema";
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
        <Box
          variant="primary"
          size="lg"
          className="flex items-center space-x-6"
        >
          {/* Avatar Placeholder */}
          <div className="bg-border text-main border-border rounded-base flex h-24 w-24 items-center justify-center border-2">
            <span className="text-2xl font-bold">
              {userData.username?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Info */}
          <div>
            <h1 className="mb-2 text-3xl font-bold">{userData.username}</h1>
            <p className="text-lg font-medium">User since {userSince}</p>
          </div>
        </Box>
      </section>

      {/* Sorters Section */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Sorters ({userSorters.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary">
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
                  <Card key={sorter.id} className="min-h-[180px]">
                    <CardHeader className="flex h-28 flex-col justify-start pb-3">
                      <CardTitle className="mb-3 line-clamp-2 text-lg leading-relaxed">
                        <Link
                          href={`/sorter/${sorter.slug}`}
                          className="hover:underline"
                        >
                          {sorter.title}
                        </Link>
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
                ))}
              </div>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}
