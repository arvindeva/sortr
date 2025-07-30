/**
 * Simple path-based cache revalidation utilities for sortr
 */

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Revalidate the homepage
 */
export async function revalidateHomepage(): Promise<void> {
  console.log("🔄 Revalidating homepage...");
  revalidatePath("/");
  console.log("✅ Homepage revalidated");
}

/**
 * Revalidate a user's profile page
 */
export async function revalidateUserProfile(username: string): Promise<void> {
  console.log(`🔄 Revalidating user profile: ${username}...`);
  revalidatePath(`/user/${username}`);
  console.log(`✅ User profile revalidated: ${username}`);
}

/**
 * Revalidate a specific sorter page
 */
export async function revalidateSorter(slug: string): Promise<void> {
  console.log(`🔄 Revalidating sorter: ${slug}...`);
  revalidatePath(`/sorter/${slug}`);
  console.log(`✅ Sorter revalidated: ${slug}`);
}

/**
 * Revalidate browse page
 */
export async function revalidateBrowse(): Promise<void> {
  console.log("🔄 Revalidating browse page...");
  revalidatePath("/browse");
  console.log("✅ Browse page revalidated");
}

/**
 * Revalidate multiple paths at once
 */
export async function revalidateMultiplePaths(paths: string[]): Promise<void> {
  console.log(`🔄 Revalidating ${paths.length} paths:`, paths);
  
  for (const path of paths) {
    revalidatePath(path);
  }
  
  console.log(`✅ All ${paths.length} paths revalidated`);
}

/**
 * Revalidate a user's profile and results by userId
 * Fetches the username from database and revalidates the profile page
 */
export async function revalidateUserResults(userId: string): Promise<void> {
  console.log(`🔄 Revalidating user results for userId: ${userId}...`);
  
  try {
    // Fetch username from database
    const userData = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0) {
      console.warn(`⚠️ User not found for userId: ${userId}`);
      return;
    }

    const username = userData[0].username;
    if (!username) {
      console.warn(`⚠️ Username is null for userId: ${userId}`);
      return;
    }

    // Revalidate the user's profile page
    await revalidateUserProfile(username);
  } catch (error) {
    console.error(`❌ Failed to revalidate user results for userId ${userId}:`, error);
    throw error;
  }
}

/**
 * Helper function for common invalidation pattern after sorter changes
 */
export async function revalidateAfterSorterChange(params: {
  username?: string;
  slug?: string;
  includeBrowse?: boolean;
}): Promise<void> {
  const paths = ["/"];
  
  if (params.username) {
    paths.push(`/user/${params.username}`);
  }
  
  if (params.slug) {
    paths.push(`/sorter/${params.slug}`);
  }
  
  if (params.includeBrowse) {
    paths.push("/browse");
  }
  
  await revalidateMultiplePaths(paths);
}