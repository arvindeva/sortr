import { notFound } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

interface UserProfilePageProps {
  params: {
    username: string;
  };
}

async function getUserByUsername(username: string) {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  return users[0] || null;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = params;
  const userData = await getUserByUsername(username);

  if (!userData) {
    notFound();
  }

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
          <span className="text-gray-600 text-2xl font-bold">
            {userData.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* User Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{userData.username}</h1>
          <p className="text-gray-600">User since {userSince}</p>
        </div>
      </div>

      {/* Sorters Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Sorters</h2>
        <div className="text-gray-500 italic">
          No sorters created yet.
        </div>
      </div>
    </div>
  );
}