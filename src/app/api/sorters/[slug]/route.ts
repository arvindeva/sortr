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
import { createSorterSchema } from "@/lib/validations";
import { copyR2ObjectsInParallel, getVersionedItemKey, getVersionedCoverKey, getR2PublicUrl } from "@/lib/r2";
import { generateTagSlug, generateSorterItemSlug } from "@/lib/utils";
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

    console.log(`🚀 Starting edit sorter request for slug: ${slug}`);

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
    console.log(`📄 Current sorter: id=${currentSorter.id}, version=${currentSorter.version}, title="${currentSorter.title}"`);

    // Check ownership
    if (currentSorter.userId !== currentUserId) {
      return Response.json(
        { error: "Forbidden: You can only edit your own sorters" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log(`📝 Request body: ${JSON.stringify(body, null, 2)}`);

    const validatedData = createSorterSchema.parse(body);
    const newVersion = currentSorter.version + 1;

    console.log(`📈 Creating new version: v${currentSorter.version} → v${newVersion}`);

    // NEW SIMPLE EDIT FLOW - ALWAYS COPY EVERYTHING
    const result = await handleEditSorterSimple(validatedData, currentSorter, newVersion, currentUserId);

    return Response.json({
      message: "Sorter updated successfully",
      version: result.newVersion,
      title: validatedData.title,
    });

  } catch (error) {
    console.error("❌ Error updating sorter:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// NEW SIMPLE EDIT HANDLER - FOLLOWS 5-CASE FLOW FROM PLAN
async function handleEditSorterSimple(validatedData: any, currentSorter: any, newVersion: number, currentUserId: string) {
  console.log(`🔧 Starting simple edit handler for sorter ${currentSorter.id}`);
  
  // Get current items to determine file operations needed
  const currentItems = await db
    .select({
      id: sorterItems.id,
      title: sorterItems.title,
      imageUrl: sorterItems.imageUrl,
    })
    .from(sorterItems)
    .where(eq(sorterItems.sorterId, currentSorter.id));

  console.log(`📋 Current items: ${currentItems.length} items`);
  console.log(`📋 New items: ${validatedData.items.length} items`);

  // STEP 1: FILE OPERATIONS FIRST (fail early if files fail)
  const fileOperationResults = await handleFileOperations(
    currentSorter,
    currentItems,
    validatedData,
    newVersion
  );

  console.log(`📁 File operations completed: ${fileOperationResults.operations} operations`);

  // STEP 2: DATABASE TRANSACTION (after files succeed)
  const result = await db.transaction(async (trx) => {
    // 1. Archive current version to sorterHistory (if not already archived)
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
      await trx.insert(sorterHistory).values({
        sorterId: currentSorter.id,
        version: currentSorter.version,
        title: currentSorter.title,
        description: currentSorter.description,
        coverImageUrl: currentSorter.coverImageUrl,
      });
      console.log(`📚 Archived current version v${currentSorter.version} to history`);
    } else {
      console.log(`📚 Version v${currentSorter.version} already in history`);
    }

    // 2. Update main sorter record
    await trx
      .update(sorters)
      .set({
        version: newVersion,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        coverImageUrl: fileOperationResults.newCoverImageUrl || null,
      })
      .where(eq(sorters.id, currentSorter.id));

    console.log(`🔄 Updated main sorter record to v${newVersion}`);

    // 3. Add new version to sorterHistory
    await trx.insert(sorterHistory).values({
      sorterId: currentSorter.id,
      title: validatedData.title,
      description: validatedData.description,
      coverImageUrl: fileOperationResults.newCoverImageUrl || null,
      version: newVersion,
    });

    console.log(`📚 Added new version v${newVersion} to history`);

    // 4. Update tags (delete old, insert new)
    await trx.delete(sorterTags).where(eq(sorterTags.sorterId, currentSorter.id));

    if (validatedData.tags && validatedData.tags.length > 0) {
      const newTags = validatedData.tags.map((tag: any, index: number) => ({
        sorterId: currentSorter.id,
        name: tag.name,
        slug: generateTagSlug(tag.name),
        sortOrder: index,
      }));
      await trx.insert(sorterTags).values(newTags);
      console.log(`🏷️ Updated ${newTags.length} tags`);
    } else {
      console.log(`🏷️ No tags to update`);
    }

    // 5. Update items (delete old, insert new with new URLs)
    await trx.delete(sorterItems).where(eq(sorterItems.sorterId, currentSorter.id));

    const newItems = validatedData.items.map((item: any, index: number) => ({
      sorterId: currentSorter.id,
      version: newVersion,
      title: item.title,
      imageUrl: fileOperationResults.newItemImageUrls[index] || null,
      tagSlugs: item.tagSlugs || [],
      sortOrder: index,
    }));
    await trx.insert(sorterItems).values(newItems);

    console.log(`📝 Updated ${newItems.length} items`);

    return { newVersion };
  });

  console.log(`✅ Simple edit completed successfully - v${currentSorter.version} → v${result.newVersion}`);
  return result;
}

// HANDLE ALL FILE OPERATIONS FOR THE 5-CASE FLOW
async function handleFileOperations(
  currentSorter: any,
  currentItems: any[],
  validatedData: any,
  newVersion: number
) {
  console.log(`📁 Starting file operations for v${newVersion}`);
  
  const copyOperations: Array<{ sourceKey: string; destKey: string; operation: string }> = [];
  let newCoverImageUrl = validatedData.coverImageUrl;
  const newItemImageUrls: (string | null)[] = new Array(validatedData.items.length);

  // COVER IMAGE HANDLING
  if (currentSorter.coverImageUrl) {
    if (validatedData.coverImageUrl?.includes('/sessions/')) {
      // Case: New cover image from session upload
      const sessionKey = extractSessionKeyFromUrl(validatedData.coverImageUrl);
      const destKey = getVersionedCoverKey(currentSorter.id.toString(), newVersion);
      copyOperations.push({ sourceKey: sessionKey, destKey, operation: "session→sorter (cover)" });
      newCoverImageUrl = getR2PublicUrl(destKey);
      console.log(`📷 Cover image: session upload → ${destKey}`);
    } else if (validatedData.coverImageUrl === currentSorter.coverImageUrl) {
      // Case: Cover image unchanged - copy to new version
      const currentKey = extractR2KeyFromUrl(currentSorter.coverImageUrl);
      const destKey = getVersionedCoverKey(currentSorter.id.toString(), newVersion);
      
      // Copy main cover image
      copyOperations.push({ sourceKey: currentKey, destKey, operation: "copy unchanged cover" });
      
      // Also copy cover thumbnail if it exists
      const currentThumbKey = currentKey.replace(/\.([^.]+)$/, '-thumb.jpg');
      const destThumbKey = destKey.replace(/\.([^.]+)$/, '-thumb.jpg');
      copyOperations.push({ 
        sourceKey: currentThumbKey, 
        destKey: destThumbKey, 
        operation: "copy unchanged cover (thumbnail)" 
      });
      
      newCoverImageUrl = getR2PublicUrl(destKey);
      console.log(`📷 Cover image: unchanged → ${destKey}`);
      console.log(`📷 Cover image: unchanged (thumbnail) → ${destThumbKey}`);
    }
  } else if (validatedData.coverImageUrl?.includes('/sessions/')) {
    // Case: Adding new cover image
    const sessionKey = extractSessionKeyFromUrl(validatedData.coverImageUrl);
    const destKey = getVersionedCoverKey(currentSorter.id, newVersion);
    copyOperations.push({ sourceKey: sessionKey, destKey, operation: "session→sorter (new cover)" });
    newCoverImageUrl = getR2PublicUrl(destKey);
    console.log(`📷 Cover image: new from session → ${destKey}`);
  }

  // ITEM IMAGES HANDLING - ALL 5 CASES
  validatedData.items.forEach((newItem: any, index: number) => {
    const currentItem = currentItems.find(item => item.title === newItem.title);
    
    if (newItem.imageUrl?.includes('/sessions/')) {
      // Case 5: Items added (with image) - session upload
      const sessionKey = extractSessionKeyFromUrl(newItem.imageUrl);
      const itemSlug = generateSorterItemSlug(newItem.title);
      const destKey = getVersionedItemKey(currentSorter.id.toString(), itemSlug, newVersion);
      copyOperations.push({ sourceKey: sessionKey, destKey, operation: `session→sorter (item ${index})` });
      newItemImageUrls[index] = getR2PublicUrl(destKey);
      console.log(`📝 Item ${index} "${newItem.title}": session upload → ${destKey}`);
    } else if (currentItem?.imageUrl) {
      // Cases 1 & 2: Items left untouched OR name changed (copy existing image)
      const currentKey = extractR2KeyFromUrl(currentItem.imageUrl);
      
      let destKey: string;
      let operation: string;
      
      if (currentItem.title === newItem.title) {
        // Case 1: Item unchanged - preserve original slug structure but new version
        const originalFileName = currentKey.split('/').pop() || 'item.jpg';
        destKey = `sorters/${currentSorter.id}/v${newVersion}/${originalFileName}`;
        operation = `copy unchanged (item ${index})`;
      } else {
        // Case 2: Item renamed - need new slug
        const itemSlug = generateSorterItemSlug(newItem.title);
        destKey = getVersionedItemKey(currentSorter.id.toString(), itemSlug, newVersion);
        operation = `copy + rename (item ${index})`;
      }
      
      // Copy main image
      copyOperations.push({ sourceKey: currentKey, destKey, operation });
      
      // Also copy thumbnail version if it exists
      const currentThumbKey = currentKey.replace(/\.([^.]+)$/, '-thumb.jpg');
      const destThumbKey = destKey.replace(/\.([^.]+)$/, '-thumb.jpg');
      copyOperations.push({ 
        sourceKey: currentThumbKey, 
        destKey: destThumbKey, 
        operation: `${operation} (thumbnail)` 
      });
      
      newItemImageUrls[index] = getR2PublicUrl(destKey);
      console.log(`📝 Item ${index} "${newItem.title}": ${operation} → ${destKey}`);
      console.log(`📝 Item ${index} "${newItem.title}": ${operation} (thumbnail) → ${destThumbKey}`);
    } else {
      // Case 4: Items added (no image) OR Case 3: Items removed (no action needed)
      newItemImageUrls[index] = null;
      console.log(`📝 Item ${index} "${newItem.title}": no image`);
    }
  });

  // EXECUTE ALL FILE OPERATIONS
  if (copyOperations.length > 0) {
    console.log(`🚀 Executing ${copyOperations.length} R2 copy operations:`);
    copyOperations.forEach((op, i) => console.log(`  ${i + 1}. ${op.operation}: ${op.sourceKey} → ${op.destKey}`));
    
    const copyResults = await copyR2ObjectsInParallel(
      copyOperations.map(op => ({ sourceKey: op.sourceKey, destKey: op.destKey })),
      10
    );
    
    // Separate thumbnail failures from main file failures
    const failedOperations = copyResults.filter(result => !result.success);
    const criticalFailures = failedOperations.filter(result => 
      !result.sourceKey.includes('-thumb') // Main files are critical
    );
    const thumbnailFailures = failedOperations.filter(result => 
      result.sourceKey.includes('-thumb') // Thumbnails are optional
    );
    
    if (thumbnailFailures.length > 0) {
      console.warn(`⚠️ ${thumbnailFailures.length} thumbnail copy operations failed (non-critical):`, 
        thumbnailFailures.map(f => f.sourceKey));
    }
    
    if (criticalFailures.length > 0) {
      console.error(`❌ ${criticalFailures.length} critical R2 copy operations failed:`, criticalFailures);
      throw new Error(`Failed to copy ${criticalFailures.length} critical files to R2`);
    }
    
    console.log(`✅ All ${copyOperations.length} file operations completed successfully`);
  } else {
    console.log(`📁 No file operations needed`);
  }

  return {
    operations: copyOperations.length,
    newCoverImageUrl,
    newItemImageUrls,
  };
}

// UTILITY FUNCTIONS
function extractSessionKeyFromUrl(url: string): string {
  // Extract key from session URL: https://example.com/sessions/abc123/item/filename.jpg → sessions/abc123/item/filename.jpg
  const match = url.match(/\/sessions\/(.+)$/);
  if (!match) throw new Error(`Invalid session URL: ${url}`);
  return `sessions/${match[1]}`;
}

function extractR2KeyFromUrl(url: string): string {
  // Extract key from R2 URL: https://example.com/sorters/123/v1/item-foo-abc123.jpg → sorters/123/v1/item-foo-abc123.jpg
  const match = url.match(/\/sorters\/(.+)$/);
  if (!match) throw new Error(`Invalid R2 URL: ${url}`);
  return `sorters/${match[1]}`;
}
