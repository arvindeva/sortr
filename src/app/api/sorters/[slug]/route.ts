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
import { createSorterSchema } from "@/lib/validations";
import { copyR2ObjectsInParallel, getVersionedItemKey, getVersionedCoverKey } from "@/lib/r2";
import { generateTagSlug } from "@/lib/utils";
import { z } from "zod";

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

export async function PUT(
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

    // Get current sorter and verify ownership
    const sorterData = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        category: sorters.category,
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

    const currentSorter = sorterData[0];

    // Check ownership
    if (currentSorter.userId !== currentUserId) {
      return Response.json(
        { error: "Forbidden: You can only edit your own sorters" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createSorterSchema.parse(body);

    // Get current items and tags for comparison
    const currentItems = await db
      .select({
        id: sorterItems.id,
        title: sorterItems.title,
        imageUrl: sorterItems.imageUrl,
        tagSlugs: sorterItems.tagSlugs,
      })
      .from(sorterItems)
      .where(eq(sorterItems.sorterId, currentSorter.id));

    const currentTags = await db
      .select({
        id: sorterTags.id,
        name: sorterTags.name,
        slug: sorterTags.slug,
        sortOrder: sorterTags.sortOrder,
      })
      .from(sorterTags)
      .where(eq(sorterTags.sorterId, currentSorter.id));

    // Increment version
    const newVersion = currentSorter.version + 1;

    // Process the edit in a transaction
    await db.transaction(async (trx) => {
      // 1. Archive current version to sorterHistory (if not already archived)
      console.log(`Checking if history exists for sorter ${currentSorter.id} v${currentSorter.version}`);
      const existingHistory = await trx
        .select({ id: sorterHistory.id })
        .from(sorterHistory)
        .where(
          and(
            eq(sorterHistory.sorterId, currentSorter.id),
            eq(sorterHistory.version, currentSorter.version)
          )
        )
        .limit(1);

      if (existingHistory.length === 0) {
        // History entry doesn't exist, create it
        await trx.insert(sorterHistory).values({
          sorterId: currentSorter.id,
          version: currentSorter.version,
          title: currentSorter.title,
          description: currentSorter.description,
          coverImageUrl: currentSorter.coverImageUrl,
        });
        console.log(
          `Archived sorter ${currentSorter.id} v${currentSorter.version} to history for edit`,
        );
      } else {
        console.log(
          `Sorter ${currentSorter.id} v${currentSorter.version} already archived, continuing with edit`,
        );
      }

      // 2. Update main sorter record
      await trx
        .update(sorters)
        .set({
          version: newVersion,
          title: validatedData.title,
          description: validatedData.description,
          category: validatedData.category,
          coverImageUrl: validatedData.coverImageUrl || null,
        })
        .where(eq(sorters.id, currentSorter.id));

      // 3. Update tags (delete old, insert new with new version)
      await trx.delete(sorterTags).where(eq(sorterTags.sorterId, currentSorter.id));

      if (validatedData.tags && validatedData.tags.length > 0) {
        const newTags = validatedData.tags.map((tag, index) => ({
          sorterId: currentSorter.id,
          name: tag.name,
          slug: generateTagSlug(tag.name),
          sortOrder: index,
        }));

        await trx.insert(sorterTags).values(newTags);
      }

      // 4. Update items (delete old, insert new with new version)
      await trx.delete(sorterItems).where(eq(sorterItems.sorterId, currentSorter.id));

      const newItems = validatedData.items.map((item, index) => ({
        sorterId: currentSorter.id,
        version: newVersion,
        title: item.title,
        imageUrl: item.imageUrl || null,
        tagSlugs: item.tagSlugs || [],
        sortOrder: index,
      }));

      await trx.insert(sorterItems).values(newItems);
    });

    // 5. Handle image copying for unchanged items (outside transaction)
    const imageCopyOperations: Array<{ sourceKey: string; destKey: string }> = [];

    // Find items that have the same imageUrl as before (unchanged)
    for (const newItem of validatedData.items) {
      if (newItem.imageUrl) {
        // Check if this imageUrl exists in current items
        const matchingCurrentItem = currentItems.find(
          (current) => current.imageUrl === newItem.imageUrl
        );

        if (matchingCurrentItem) {
          // This is an unchanged image that needs to be copied to new version
          const itemSlug = generateTagSlug(newItem.title);
          const sourceKey = getVersionedItemKey(
            currentSorter.id,
            generateTagSlug(matchingCurrentItem.title),
            currentSorter.version
          );
          const destKey = getVersionedItemKey(
            currentSorter.id,
            itemSlug,
            newVersion
          );

          imageCopyOperations.push({ sourceKey, destKey });
        }
      }
    }

    // Copy cover image if unchanged
    if (
      validatedData.coverImageUrl &&
      validatedData.coverImageUrl === currentSorter.coverImageUrl
    ) {
      const sourceCoverKey = getVersionedCoverKey(currentSorter.id, currentSorter.version);
      const destCoverKey = getVersionedCoverKey(currentSorter.id, newVersion);
      imageCopyOperations.push({ sourceKey: sourceCoverKey, destKey: destCoverKey });
    }

    // Perform image copying in parallel
    if (imageCopyOperations.length > 0) {
      console.log(`Copying ${imageCopyOperations.length} unchanged images to version ${newVersion}`);
      const copyResults = await copyR2ObjectsInParallel(imageCopyOperations);
      
      const failedCopies = copyResults.filter(result => !result.success);
      if (failedCopies.length > 0) {
        console.warn(`Failed to copy ${failedCopies.length} images:`, failedCopies);
        // Don't fail the entire request, but log the issues
      }
    }

    // 6. Revalidate caches
    try {
      await revalidateAfterSorterChange({
        username: userData[0].username || undefined,
        slug: slug,
        includeBrowse: true,
      });
    } catch (revalidateError) {
      console.warn("Failed to revalidate caches:", revalidateError);
    }

    return Response.json({
      message: "Sorter updated successfully",
      version: newVersion,
      title: validatedData.title,
    });

  } catch (error) {
    console.error("Error updating sorter:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
