import { db } from "@/db";
import {
  sorters,
  sorterItems,
  sorterTags,
  user,
  sortingResults,
  sorterHistory,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidateAfterSorterChange } from "@/lib/revalidation";

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
        coverImageUrl: sorters.coverImageUrl,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        creatorUsername: user.username,
        creatorId: user.id,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(and(eq(sorters.slug, slug), eq(sorters.deleted, false)))
      .limit(1);

    if (sorterData.length === 0) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    const sorter = sorterData[0];

    // First check for tags (new system)
    const tags = await db
      .select({
        id: sorterTags.id,
        name: sorterTags.name,
        slug: sorterTags.slug,
        sortOrder: sorterTags.sortOrder,
      })
      .from(sorterTags)
      .where(eq(sorterTags.sorterId, sorter.id));

    if (tags.length > 0) {
      // Tag-based sorter (new system)
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
          tagSlugs: sorterItems.tagSlugs,
        })
        .from(sorterItems)
        .where(eq(sorterItems.sorterId, sorter.id));

      // Group items by tags for the filter page
      // Include untagged items (empty tagSlugs array) in all tag groups
      const tagsWithItems = tags.map((tag) => ({
        ...tag,
        items: items
          .filter((item) => 
            // Include items that have this tag OR items with no tags (empty array)
            (item.tagSlugs && item.tagSlugs.includes(tag.slug)) ||
            (!item.tagSlugs || item.tagSlugs.length === 0)
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
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
        tags: tagsWithItems,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          tagSlugs: item.tagSlugs,
        })),
      });
    } else {
      // Traditional sorter (no tags, no groups)
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
      .select({ id: user.id, username: user.username })
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
      .where(and(eq(sorters.slug, slug), eq(sorters.deleted, false)))
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
      console.log(
        `Archived sorter ${sorter.id} v${sorter.version} to history before deletion`,
      );
    } catch (error) {
      // Might already exist (unique constraint), that's OK
      console.log(`Sorter ${sorter.id} v${sorter.version} already in history`);
    }

    // 2. Soft delete the sorter (set deleted = true)
    await db
      .update(sorters)
      .set({ deleted: true })
      .where(eq(sorters.id, sorter.id));

    // NOTE: We do NOT delete sorterItems or sorterHistory
    // All versioned data remains in database for rankings to reference
    // Future cleanup will only remove versions with no ranking references

    // Revalidate caches that show sorter data
    try {
      await revalidateAfterSorterChange({
        username: userData[0].username || undefined,
        slug: slug,
        includeBrowse: true,
      });
    } catch (revalidateError) {
      console.warn("Failed to revalidate caches:", revalidateError);
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
