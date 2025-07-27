import { db } from "@/db";
import {
  sorters,
  sorterItems,
  sorterGroups,
  user,
  sortingResults,
  sorterHistory,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Get sorter data with creator info
    const sorterData = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        category: sorters.category,
        slug: sorters.slug,
        useGroups: sorters.useGroups,
        coverImageUrl: sorters.coverImageUrl,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        creatorUsername: user.username,
        creatorId: user.id,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(and(
        eq(sorters.slug, slug),
        eq(sorters.deleted, false)
      ))
      .limit(1);

    if (sorterData.length === 0) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    const sorter = sorterData[0];

    if (sorter.useGroups) {
      // Get groups with their items
      const groups = await db
        .select({
          id: sorterGroups.id,
          name: sorterGroups.name,
          slug: sorterGroups.slug,
          coverImageUrl: sorterGroups.coverImageUrl,
          createdAt: sorterGroups.createdAt,
        })
        .from(sorterGroups)
        .where(eq(sorterGroups.sorterId, sorter.id));

      // Get all items with their group IDs and group cover images
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
          groupId: sorterItems.groupId,
          groupCoverImageUrl: sorterGroups.coverImageUrl,
        })
        .from(sorterItems)
        .leftJoin(sorterGroups, eq(sorterItems.groupId, sorterGroups.id))
        .where(eq(sorterItems.sorterId, sorter.id));

      // Group items by group
      const groupsWithItems = groups.map((group) => ({
        ...group,
        items: items
          .filter((item) => item.groupId === group.id)
          .map((item) => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
            groupImageUrl: item.groupCoverImageUrl,
          })),
      }));

      return Response.json({
        sorter: {
          ...sorter,
          user: {
            username: sorter.creatorUsername,
            id: sorter.creatorId,
          },
        },
        groups: groupsWithItems,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          groupImageUrl: item.groupCoverImageUrl,
        })), // Also return flat items list for backward compatibility
      });
    } else {
      // Get sorter items (traditional mode)
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
        })
        .from(sorterItems)
        .where(eq(sorterItems.sorterId, sorter.id));

      return Response.json({
        sorter: {
          ...sorter,
          user: {
            username: sorter.creatorUsername,
            id: sorter.creatorId,
          },
        },
        items,
      });
    }
  } catch (error) {
    console.error("Error fetching sorter:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user
    const userData = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const currentUserId = userData[0].id;

    // Get sorter and verify ownership
    const sorterData = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        coverImageUrl: sorters.coverImageUrl,
        version: sorters.version,
        userId: sorters.userId,
      })
      .from(sorters)
      .where(and(
        eq(sorters.slug, slug),
        eq(sorters.deleted, false)
      ))
      .limit(1);

    if (sorterData.length === 0) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    const sorter = sorterData[0];

    // Check ownership
    if (sorter.userId !== currentUserId) {
      return Response.json(
        { error: "Forbidden: You can only delete your own sorters" },
        { status: 403 },
      );
    }

    // NEW VERSIONING-AWARE DELETION LOGIC
    // We use SOFT DELETE to preserve data for rankings
    
    // 1. Archive current version to sorterHistory (if not already there)
    try {
      await db.insert(sorterHistory).values({
        sorterId: sorter.id,
        title: sorter.title,
        description: sorter.description,
        coverImageUrl: sorter.coverImageUrl,
        version: sorter.version,
      });
      console.log(`Archived sorter ${sorter.id} v${sorter.version} to history before deletion`);
    } catch (error) {
      // Might already exist (unique constraint), that's OK
      console.log(`Sorter ${sorter.id} v${sorter.version} already in history`);
    }

    // 2. Soft delete the sorter (set deleted = true)
    await db
      .update(sorters)
      .set({ deleted: true })
      .where(eq(sorters.id, sorter.id));

    // NOTE: We do NOT delete sorterItems, sorterGroups, or sorterHistory
    // All versioned data remains in database for rankings to reference
    // Future cleanup will only remove versions with no ranking references

    // Revalidate pages that show sorter data
    try {
      revalidatePath("/"); // Homepage (popular sorters)
      revalidatePath(`/sorter/${slug}`); // Sorter page (will 404, but clears cache)
    } catch (revalidateError) {
      console.warn("Failed to revalidate some paths:", revalidateError);
      // Don't fail the entire request if revalidation fails
    }

    return Response.json({
      message: "Sorter deleted successfully",
      title: sorter.title,
    });
  } catch (error) {
    console.error("Error deleting sorter:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
