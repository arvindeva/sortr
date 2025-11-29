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
import {
  copyR2ObjectsInParallel,
  getR2PublicUrl,
  getFlatCoverKey,
  getFlatItemKeyStable,
  getFlatItemThumbKeyStable,
  generateUniqueFileId,
  extractSessionKeyFromUrl,
  extractR2KeyFromUrl,
} from "@/lib/r2";
import { generateTagSlug, generateSorterItemSlug } from "@/lib/utils";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSorterDataCached } from "@/lib/sorter-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const data = await getSorterDataCached(slug);

    if (!data) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    return Response.json(data, {
      headers: {
        // Edge cache regardless of cookies for 5 minutes
        "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        // Small browser cache to smooth bursts
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
      },
    });
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

    // Revalidate relevant paths after sorter deletion
    revalidatePath(`/sorter/${slug}`); // The sorter page (will show 404)
    revalidatePath('/'); // Homepage shows popular sorters
    revalidatePath('/browse'); // Browse page shows all sorters
    revalidateTag(`sorter-${slug}`); // Granular cache tag for this sorter
    revalidateTag(`sorter-results-${slug}`); // Granular cache tag for results
    if (userData[0].username) {
      revalidatePath(`/user/${userData[0].username}`); // Creator's profile page
      console.log(`♻️ Revalidated paths for deleted sorter: ${slug}`);
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
    console.log(
      `📄 Current sorter: id=${currentSorter.id}, version=${currentSorter.version}, title="${currentSorter.title}"`,
    );

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

    console.log(
      `📈 Creating new version: v${currentSorter.version} → v${newVersion}`,
    );

    // OPTIMIZED EDIT FLOW - FLAT STRUCTURE + COPY-ON-WRITE
    const result = await handleEditSorter(
      validatedData,
      currentSorter,
      newVersion,
      currentUserId,
    );

    // Revalidate relevant paths after sorter update
    revalidatePath(`/sorter/${slug}`); // The sorter page itself
    revalidatePath('/'); // Homepage shows popular sorters
    revalidatePath('/browse'); // Browse page shows all sorters
    revalidateTag(`sorter-${slug}`); // Granular cache tag for this sorter
    revalidateTag(`sorter-results-${slug}`); // Granular cache tag for results
    // Also revalidate API responses used by the page
    revalidatePath(`/api/sorters/${slug}`);
    revalidatePath(`/api/sorters/${slug}/results`);
    if (userData[0].username) {
      revalidatePath(`/user/${userData[0].username}`); // Creator's profile page
      console.log(`♻️ Revalidated paths for updated sorter: ${slug}`);
    }

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
        { status: 400 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// OPTIMIZED EDIT HANDLER - FLAT STRUCTURE + COPY-ON-WRITE
async function handleEditSorter(
  validatedData: any,
  currentSorter: any,
  newVersion: number,
  currentUserId: string,
) {
  console.log(`🔧 Starting optimized edit handler for sorter ${currentSorter.id}`);

  // Get current items to determine what's changed
  const currentItems = await db
    .select({
      id: sorterItems.id,
      title: sorterItems.title,
      slug: sorterItems.slug,
      imageUrl: sorterItems.imageUrl,
      version: sorterItems.version,
    })
    .from(sorterItems)
    .where(eq(sorterItems.sorterId, currentSorter.id));

  console.log(`📋 Current items: ${currentItems.length} items`);
  console.log(`📋 New items: ${validatedData.items.length} items`);

  // STEP 1: OPTIMIZED FILE OPERATIONS (only copy/upload changed files)
  const fileOperationResults = await handleFileOperations(
    currentSorter,
    currentItems,
    validatedData,
    newVersion,
  );

  console.log(
    `📁 File operations completed: ${fileOperationResults.operations} operations (optimized)`,
  );

  // STEP 2: DATABASE TRANSACTION (using item-level versioning)
  const result = await db.transaction(async (trx) => {
    // 1. Archive current version to sorterHistory (if not already archived)
    const existingHistory = await trx
      .select({ id: sorterHistory.id })
      .from(sorterHistory)
      .where(
        and(
          eq(sorterHistory.sorterId, currentSorter.id),
          eq(sorterHistory.version, currentSorter.version),
        ),
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
      console.log(
        `📚 Archived current version v${currentSorter.version} to history`,
      );
    } else {
      console.log(`📚 Version v${currentSorter.version} already in history`);
    }

    // 2. Update main sorter record (metadata only)
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
    await trx
      .delete(sorterTags)
      .where(eq(sorterTags.sorterId, currentSorter.id));

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

    // 5. Update items with ITEM-LEVEL VERSIONING (delete old, insert new)
    await trx
      .delete(sorterItems)
      .where(eq(sorterItems.sorterId, currentSorter.id));

    const newItems = validatedData.items.map((item: any, index: number) => {
      // Match by index position instead of title to preserve images when names change
      const currentItem = currentItems[index];
      const hasChanged = !currentItem || 
        currentItem.title !== item.title ||
        currentItem.imageUrl !== fileOperationResults.newItemImageUrls[index];

      return {
        sorterId: currentSorter.id,
        version: hasChanged ? newVersion : (currentItem?.version || newVersion), // Item-level versioning
        title: item.title,
        slug: generateSorterItemSlug(item.title),
        imageUrl: fileOperationResults.newItemImageUrls[index] || null,
        tagSlugs: item.tagSlugs || [],
        sortOrder: index,
      };
    });
    
    await trx.insert(sorterItems).values(newItems);

    console.log(`📝 Updated ${newItems.length} items with item-level versioning`);

    return { newVersion };
  });

  console.log(
    `✅ Optimized edit completed successfully - v${currentSorter.version} → v${result.newVersion}`,
  );
  return result;
}

// OPTIMIZED FILE OPERATIONS - FLAT STRUCTURE + COPY-ON-WRITE
async function handleFileOperations(
  currentSorter: any,
  currentItems: any[],
  validatedData: any,
  newVersion: number,
) {
  console.log(`📁 Starting optimized file operations for sorter ${currentSorter.id}`);

  const copyOperations: Array<{
    sourceKey: string;
    destKey: string;
    operation: string;
  }> = [];
  let newCoverImageUrl = validatedData.coverImageUrl;
  const newItemImageUrls: (string | null)[] = new Array(
    validatedData.items.length,
  );

  // COVER IMAGE - only copy/upload if changed
  if (validatedData.coverImageUrl?.includes("/sessions/")) {
    // New cover from upload - copy to flat structure with unique ID
    const sessionKey = extractSessionKeyFromUrl(validatedData.coverImageUrl);
    const uniqueId = generateUniqueFileId();
    const destKey = getFlatCoverKey(currentSorter.id, uniqueId);
    copyOperations.push({
      sourceKey: sessionKey,
      destKey,
      operation: "session→flat (cover)",
    });
    newCoverImageUrl = getR2PublicUrl(destKey);
    console.log(`📷 Cover image: NEW from session → ${destKey}`);
  } else if (validatedData.coverImageUrl === currentSorter.coverImageUrl) {
    // Cover unchanged - keep existing URL, no copy needed
    newCoverImageUrl = currentSorter.coverImageUrl;
    console.log(`📷 Cover image: UNCHANGED - no copy needed`);
  } else if (!validatedData.coverImageUrl && currentSorter.coverImageUrl) {
    // Cover removed - no copy needed
    newCoverImageUrl = null;
    console.log(`📷 Cover image: REMOVED - no copy needed`);
  }

  // ITEM IMAGES - only process changed/new items
  validatedData.items.forEach((newItem: any, index: number) => {
    // Match by index position instead of title to preserve images when names change
    const currentItem = currentItems[index];
    
    if (newItem.imageUrl?.includes("/sessions/")) {
      // NEW IMAGE from upload session
      const sessionKey = extractSessionKeyFromUrl(newItem.imageUrl);
      const itemSlug = generateSorterItemSlug(newItem.title);
      const destKey = getFlatItemKeyStable(currentSorter.id, itemSlug);
      const destThumbKey = getFlatItemThumbKeyStable(currentSorter.id, itemSlug);
      
      // Copy main + thumbnail
      copyOperations.push({
        sourceKey: sessionKey,
        destKey,
        operation: `session→flat (item ${index})`,
      });
      copyOperations.push({
        sourceKey: sessionKey.replace('.jpg', '-thumb.jpg'),
        destKey: destThumbKey,
        operation: `session→flat (item ${index} thumb)`,
      });
      
      newItemImageUrls[index] = getR2PublicUrl(destKey);
      console.log(
        `📝 Item ${index} "${newItem.title}": NEW from session → ${destKey}`,
      );
      
    } else if (currentItem?.imageUrl) {
      // EXISTING IMAGE - keep same URL, no copy needed!
      newItemImageUrls[index] = currentItem.imageUrl;
      console.log(
        `📝 Item ${index} "${newItem.title}": UNCHANGED - no copy needed (${currentItem.imageUrl})`,
      );
      // No copy operation = MASSIVE performance gain
      
    } else {
      // No image
      newItemImageUrls[index] = null;
      console.log(`📝 Item ${index} "${newItem.title}": no image`);
    }
  });

  // Execute ONLY the necessary copy operations
  // Result: 60-item edit with 1 new image = 2 operations instead of 122
  if (copyOperations.length > 0) {
    console.log(
      `🚀 Executing ${copyOperations.length} R2 copy operations (OPTIMIZED):`,
    );
    copyOperations.forEach((op, i) =>
      console.log(
        `  ${i + 1}. ${op.operation}: ${op.sourceKey} → ${op.destKey}`,
      ),
    );

    const copyResults = await copyR2ObjectsInParallel(
      copyOperations.map((op) => ({
        sourceKey: op.sourceKey,
        destKey: op.destKey,
      })),
      10,
    );

    // Separate thumbnail failures from main file failures
    const failedOperations = copyResults.filter((result) => !result.success);
    const criticalFailures = failedOperations.filter(
      (result) => !result.sourceKey.includes("-thumb"), // Main files are critical
    );
    const thumbnailFailures = failedOperations.filter(
      (result) => result.sourceKey.includes("-thumb"), // Thumbnails are optional
    );

    if (thumbnailFailures.length > 0) {
      console.warn(
        `⚠️ ${thumbnailFailures.length} thumbnail copy operations failed (non-critical):`,
        thumbnailFailures.map((f) => f.sourceKey),
      );
    }

    if (criticalFailures.length > 0) {
      console.error(
        `❌ ${criticalFailures.length} critical R2 copy operations failed:`,
        criticalFailures,
      );
      throw new Error(
        `Failed to copy ${criticalFailures.length} critical files to R2`,
      );
    }

    console.log(
      `✅ All ${copyOperations.length} OPTIMIZED file operations completed successfully`,
    );
  } else {
    console.log(`📁 No file operations needed (MASSIVE performance gain!)`);
  }

  return {
    operations: copyOperations.length,
    newCoverImageUrl,
    newItemImageUrls,
  };
}
