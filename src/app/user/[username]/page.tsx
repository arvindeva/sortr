import { notFound } from "next/navigation";
import { db } from "@/db";
import { user, sorters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  const userData = await getUserByUsername(username);

  if (!userData) {
    notFound();
  }

  const userSorters = await getUserSorters(userData.id);

  const userSince = new Date(userData.emailVerified || new Date()).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <div className="flex items-center space-x-6 mb-8">
        {/* Avatar Placeholder */}
        <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-muted-foreground text-2xl font-bold">
            {userData.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* User Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{userData.username}</h1>
          <p className="text-muted-foreground">User since {userSince}</p>
        </div>
      </div>

      {/* Sorters Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Sorters ({userSorters.length})</h2>
        </div>
        
        {userSorters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No sorters created yet.</p>
            <p className="text-muted-foreground">Start creating sorters to share with others!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userSorters.map((sorter) => (
              <Link key={sorter.id} href={`/sorter/${sorter.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-6">{sorter.title}</CardTitle>
                      {sorter.category && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground flex-shrink-0 ml-2">
                          {sorter.category}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sorter.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {sorter.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
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