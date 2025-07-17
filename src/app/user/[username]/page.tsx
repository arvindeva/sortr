import { notFound } from "next/navigation";
import { db } from "@/db";
import { user, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8 flex items-center space-x-6">
        {/* Avatar Placeholder */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-300">
          <span className="text-muted-foreground text-2xl font-bold">
            {userData.username?.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* User Info */}
        <div>
          <h1 className="mb-2 text-2xl font-bold">{userData.username}</h1>
          <p className="text-muted-foreground">User since {userSince}</p>
        </div>
      </div>

      {/* Sorters Section */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sorters ({userSorters.length})</h2>
        </div>

        {userSorters.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4 text-lg">
              No sorters created yet.
            </p>
            <p className="text-muted-foreground">
              Start creating sorters to share with others!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userSorters.map((sorter) => (
              <Link key={sorter.id} href={`/sorter/${sorter.slug}`}>
                <Card className="hover:border-primary/50 flex min-h-[180px] cursor-pointer flex-col transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
                  <CardHeader className="flex h-28 flex-col justify-start pb-3">
                    <CardTitle className="mb-3 line-clamp-2 text-lg leading-relaxed">
                      {sorter.title}
                    </CardTitle>
                    {sorter.category && <Badge>{sorter.category}</Badge>}
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
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
      </div>
    </div>
  );
}
