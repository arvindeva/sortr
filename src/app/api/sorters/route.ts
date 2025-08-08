import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";

// Increase function timeout for R2 operations
export const maxDuration = 60;
import {
  sorters,
  sorterItems,
  sorterTags,
  user,
  sorterHistory,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { createSorterSchema } from "@/lib/validations";
import {
  generateUniqueSlug,
  generateSorterSlug,
  generateSorterItemSlug,
  generateUniqueTagSlug,
  validateTagName,
} from "@/lib/utils";
import { handleSorterWithUploadSession } from "@/lib/sorter-session-handler";
import {
  uploadToR2,
  getR2PublicUrl,
  getFlatCoverKey,
  getFlatItemKey,
  getFlatItemThumbKey,
  generateUniqueFileId,
  copyR2ObjectsInParallel,
} from "@/lib/r2";
import {
  getUploadSession,
  getSessionFiles,
  completeUploadSession,
} from "@/lib/session-manager";
import {
  processCoverImage,
  validateCoverImageBuffer,
  processSorterItemImage,
  validateSorterItemImageBuffer,
} from "@/lib/image-processing";
import { revalidatePath } from "next/cache";

const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ITEM_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_ITEM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function handleUploadSessionRequest(body: any, userData: any) {
  // Get existing slugs to ensure uniqueness
  const existingSorters = await db.select({ slug: sorters.slug }).from(sorters);
  const existingSlugs = existingSorters.map((s) => s.slug);

  return await handleSorterWithUploadSession(body, userData.id, {
    mode: "create",
    existingSlugs,
    generateSlug: generateSorterSlug,
    makeSlugUnique: generateUniqueSlug,
  });
}

async function handleTagBasedSorterCreation(body: any, userData: any) {
  try {
    console.log("🏷️  Creating tag-based sorter");
    console.log("📝 Body received:", JSON.stringify(body, null, 2));

    // Validate the data
    const validatedData = createSorterSchema.parse(body);
    console.log("✅ Validated data:", JSON.stringify(validatedData, null, 2));

    // Generate slug for sorter
    const slug = generateSorterSlug(validatedData.title);

    // Create sorter with tags in a transaction
    const result = await db.transaction(async (tx) => {
      // Handle cover image conversion from session to flat structure
      let finalCoverImageUrl = validatedData.coverImageUrl;
      if (validatedData.coverImageUrl?.includes("/sessions/")) {
        const sessionKey = validatedData.coverImageUrl.match(/\/sessions\/(.+)$/)?.[1];
        if (sessionKey) {
          const uniqueId = generateUniqueFileId();
          const destKey = getFlatCoverKey(slug, uniqueId); // Use slug as temporary ID, will update after sorter creation
          
          // Copy from session to flat structure
          await copyR2ObjectsInParallel([
            {
              sourceKey: `sessions/${sessionKey}`,
              destKey: destKey,
            },
          ]);
          
          finalCoverImageUrl = getR2PublicUrl(destKey);
        }
      }

      // Create the sorter (without useGroups field)
      const [newSorter] = await tx
        .insert(sorters)
        .values({
          title: validatedData.title,
          description: validatedData.description || null,
          category: validatedData.category || null,
          slug: slug,
          coverImageUrl: finalCoverImageUrl || null,
          userId: userData.id,
          version: 1,
          // Note: useGroups field removed from schema
        })
        .returning();

      // If we used slug as temporary ID for cover, update to use proper sorter ID
      if (validatedData.coverImageUrl?.includes("/sessions/") && finalCoverImageUrl) {
        const tempKey = finalCoverImageUrl.match(/\/sorters\/(.+)$/)?.[1];
        if (tempKey && tempKey.startsWith(slug)) {
          const uniqueId = generateUniqueFileId();
          const correctKey = getFlatCoverKey(newSorter.id, uniqueId);
          
          // Copy to correct location with proper sorter ID
          await copyR2ObjectsInParallel([
            {
              sourceKey: `sorters/${tempKey}`,
              destKey: correctKey,
            },
          ]);
          
          finalCoverImageUrl = getR2PublicUrl(correctKey);
          
          // Update sorter with correct URL
          await tx
            .update(sorters)
            .set({ coverImageUrl: finalCoverImageUrl })
            .where(eq(sorters.id, newSorter.id));
            
          newSorter.coverImageUrl = finalCoverImageUrl;
        }
      }

      // Add to sorterHistory as version 1
      await tx.insert(sorterHistory).values({
        sorterId: newSorter.id,
        title: newSorter.title,
        description: newSorter.description,
        coverImageUrl: newSorter.coverImageUrl,
        version: 1,
      });

      // Create tags if provided
      const createdTagSlugs = new Map<string, string>(); // tagName -> slug
      if (validatedData.tags && validatedData.tags.length > 0) {
        for (const tag of validatedData.tags) {
          // Generate unique slug for this tag within the sorter
          const existingTagSlugs = Array.from(createdTagSlugs.values());
          const tagSlug = generateUniqueTagSlug(tag.name, existingTagSlugs);

          // Create the tag
          await tx.insert(sorterTags).values({
            sorterId: newSorter.id,
            name: tag.name,
            slug: tagSlug,
            sortOrder: tag.sortOrder,
          });

          createdTagSlugs.set(tag.name, tagSlug);
        }
      }

      // Create items with tag assignments
      if (validatedData.items && validatedData.items.length > 0) {
        for (const item of validatedData.items) {
          // Generate item slug
          const itemSlug = generateSorterItemSlug(item.title);
          
          // Handle image URL conversion from session to flat structure
          let finalImageUrl = item.imageUrl;
          if (item.imageUrl?.includes("/sessions/")) {
            // Convert session upload to flat structure
            const sessionKey = item.imageUrl.match(/\/sessions\/(.+)$/)?.[1];
            if (sessionKey) {
              const uniqueId = generateUniqueFileId();
              const destKey = getFlatItemKey(newSorter.id, itemSlug, uniqueId);
              const destThumbKey = getFlatItemThumbKey(newSorter.id, itemSlug, uniqueId);
              
              // Copy from session to flat structure
              await copyR2ObjectsInParallel([
                {
                  sourceKey: `sessions/${sessionKey}`,
                  destKey: destKey,
                },
                {
                  sourceKey: `sessions/${sessionKey}`.replace('.jpg', '-thumb.jpg'),
                  destKey: destThumbKey,
                },
              ]);
              
              finalImageUrl = getR2PublicUrl(destKey);
            }
          }

          // Map tag names from form to actual slugs
          const actualTagSlugs: string[] = [];
          if (item.tagSlugs && item.tagSlugs.length > 0) {
            // tagSlugs actually contains tag names from the frontend
            for (const tagName of item.tagSlugs) {
              if (createdTagSlugs.has(tagName)) {
                actualTagSlugs.push(createdTagSlugs.get(tagName)!);
              }
            }
          }

          await tx.insert(sorterItems).values({
            sorterId: newSorter.id,
            title: item.title,
            slug: itemSlug,
            imageUrl: finalImageUrl || null,
            tagSlugs: actualTagSlugs, // Array of tag slugs
            version: 1,
          });
        }
      }

      return { sorter: newSorter };
    });

    console.log(
      `✅ Tag-based sorter created: ${result.sorter.title} (${result.sorter.slug})`,
    );

    // Revalidate relevant paths for new sorter
    revalidatePath('/'); // Homepage shows popular sorters
    revalidatePath('/browse'); // Browse page shows all sorters
    revalidatePath(`/sorter/${result.sorter.slug}`); // New sorter page
    if (userData.username) {
      revalidatePath(`/user/${userData.username}`); // Creator's profile page
      console.log(`♻️ Revalidated paths for new sorter: ${result.sorter.slug}`);
    }

    return NextResponse.json({
      success: true,
      sorter: result.sorter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Error creating tag-based sorter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if request contains multipart form data (with cover image and/or item images)
    const contentType = request.headers.get("content-type") || "";
    let validatedData;
    let coverImageFile: File | null = null;
    let itemImageFiles: File[] = [];
    let groupCoverFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart form data (with potential cover image, item images, and group cover images)
      const formData = await request.formData();
      const dataJson = formData.get("data") as string;
      coverImageFile = formData.get("coverImage") as File | null;

      // Collect all item images - they come with keys like "itemImage_0", "itemImage_1", etc.
      const itemImageEntries = Array.from(formData.entries()).filter(([key]) =>
        key.startsWith("itemImage_"),
      );
      itemImageFiles = itemImageEntries.map(([, file]) => file as File);

      // Collect all group cover images - they come with keys like "groupCover_0", "groupCover_1", etc.
      const groupCoverEntries = Array.from(formData.entries()).filter(([key]) =>
        key.startsWith("groupCover_"),
      );
      groupCoverFiles = groupCoverEntries.map(([, file]) => file as File);

      if (!dataJson) {
        return NextResponse.json(
          { error: "Missing sorter data" },
          { status: 400 },
        );
      }

      let body;
      try {
        body = JSON.parse(dataJson);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError, "Raw data:", dataJson);
        return NextResponse.json(
          { error: "Invalid JSON format in form data" },
          { status: 400 },
        );
      }
      validatedData = createSorterSchema.parse(body);
    } else {
      // Handle regular JSON request
      const body = await request.json();

      // Check if this is an upload session request
      // If uploadSession is null but we have uploadedFiles, extract sessionId from the file keys
      let sessionId = body.uploadSession;
      if (!sessionId && body.uploadedFiles && body.uploadedFiles.length > 0) {
        // Extract session ID from the first file key: sessions/{sessionId}/...
        const firstFileKey = body.uploadedFiles[0].key;
        const match = firstFileKey.match(/^sessions\/([^\/]+)\//);
        if (match) {
          sessionId = match[1];
        }
      }

      if (sessionId && body.uploadedFiles) {
        // Add the sessionId back to the body
        const bodyWithSession = { ...body, uploadSession: sessionId };
        return await handleUploadSessionRequest(bodyWithSession, userData[0]);
      }

      // Handle tag-based sorter creation (new simplified path)
      if (body.tags !== undefined) {
        return await handleTagBasedSorterCreation(body, userData[0]);
      }

      validatedData = createSorterSchema.parse(body);
    }

    // Generate slug for sorter
    const slug = generateSorterSlug(validatedData.title);

    // Process cover image if provided
    let coverImageUrl: string | null = null;
    if (coverImageFile) {
      // Validate file type
      if (!ALLOWED_COVER_TYPES.includes(coverImageFile.type)) {
        return NextResponse.json(
          {
            error: "Only JPG, PNG, and WebP files are allowed for cover image",
          },
          { status: 400 },
        );
      }

      // Validate file size
      if (coverImageFile.size > MAX_COVER_SIZE) {
        return NextResponse.json(
          { error: "Cover image size must be less than 10MB" },
          { status: 400 },
        );
      }

      // Convert file to buffer
      const bytes = await coverImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate image buffer
      const isValidImage = await validateCoverImageBuffer(buffer);
      if (!isValidImage) {
        return NextResponse.json(
          { error: "Invalid cover image format or dimensions" },
          { status: 400 },
        );
      }

      // Process image: crop to square and resize to 300x300
      const processedBuffer = await processCoverImage(buffer);

      // We'll upload after creating the sorter to get the real ID
      coverImageUrl = "PLACEHOLDER"; // Will be updated after sorter creation
    }

    // Validate and process item images in parallel
    const processedItemImages: { file: File; buffer: Buffer; name: string }[] =
      [];

    if (itemImageFiles.length > 0) {
      const imageProcessingPromises = itemImageFiles.map(
        async (itemImageFile) => {
          // Validate file type
          if (!ALLOWED_ITEM_IMAGE_TYPES.includes(itemImageFile.type)) {
            throw new Error(
              `Only JPG, PNG, and WebP files are allowed for item images. Invalid file: ${itemImageFile.name}`,
            );
          }

          // Validate file size
          if (itemImageFile.size > MAX_ITEM_IMAGE_SIZE) {
            throw new Error(
              `Item image size must be less than 5MB. Invalid file: ${itemImageFile.name}`,
            );
          }

          // Convert file to buffer
          const bytes = await itemImageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Validate image buffer
          const isValidImage = await validateSorterItemImageBuffer(buffer);
          if (!isValidImage) {
            throw new Error(
              `Invalid item image format or dimensions: ${itemImageFile.name}`,
            );
          }

          // Process image: crop to square and resize to 300x300
          const processedBuffer = await processSorterItemImage(buffer);

          // Extract item name from filename (remove extension)
          const itemName = itemImageFile.name.replace(/\.[^/.]+$/, "");

          return {
            file: itemImageFile,
            buffer: processedBuffer,
            name: itemName,
          };
        },
      );

      try {
        const results = await Promise.all(imageProcessingPromises);
        processedItemImages.push(...results);
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to process images",
          },
          { status: 400 },
        );
      }
    }

    // Wrap entire sorter creation in database transaction
    console.log("🚀 Starting sorter creation transaction...");
    const result = await db.transaction(async (tx) => {
      // Create sorter
      const [newSorter] = await tx
        .insert(sorters)
        .values({
          title: validatedData.title,
          description: validatedData.description || null,
          category: validatedData.category || null,
          slug: slug,
          coverImageUrl: validatedData.coverImageUrl || null,
          userId: userData[0].id,
          version: 1, // Start with version 1
        })
        .returning();

      // NEW: Immediately add to sorterHistory as version 1
      await tx.insert(sorterHistory).values({
        sorterId: newSorter.id,
        title: newSorter.title,
        description: newSorter.description,
        coverImageUrl: newSorter.coverImageUrl,
        version: 1,
      });

      // Upload cover image if provided
      if (coverImageFile && coverImageUrl === "PLACEHOLDER") {
        const bytes = await coverImageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const processedBuffer = await processCoverImage(buffer);

        // Generate flat cover key and upload processed image to R2
        const uniqueId = generateUniqueFileId();
        const coverKey = getFlatCoverKey(newSorter.id, uniqueId);
        await uploadToR2(coverKey, processedBuffer, "image/jpeg");

        // Generate R2 public URL with cache-busting timestamp
        const timestamp = Date.now();
        const finalCoverUrl = `${getR2PublicUrl(coverKey)}?t=${timestamp}`;

        // Update the sorter with the real cover image URL
        await tx
          .update(sorters)
          .set({ coverImageUrl: finalCoverUrl })
          .where(eq(sorters.id, newSorter.id));

        // NEW: Also update sorterHistory for version 1
        await tx
          .update(sorterHistory)
          .set({ coverImageUrl: finalCoverUrl })
          .where(
            and(
              eq(sorterHistory.sorterId, newSorter.id),
              eq(sorterHistory.version, 1),
            ),
          );

        // Update the returned sorter object
        newSorter.coverImageUrl = finalCoverUrl;
      }

      // Process items - the frontend now handles merging images with form items
      // so we just need to process the form items and match them with uploaded images
      const allProcessedItems: Array<{
        title: string;
        imageUrl?: string;
        slug?: string;
        groupName?: string;
        hasImage: boolean;
      }> = [];

      // Add items from form data (which may already include image-based items)
      if (validatedData.items) {
        for (const item of validatedData.items) {
          allProcessedItems.push({
            title: item.title,
            imageUrl: item.imageUrl,
            hasImage: false, // Will be determined by matching with uploaded images
          });
        }
      }

      // Match uploaded images with form items by filename
      // The frontend puts image filenames (without extension) as item titles
      let imageIndex = 0;
      for (
        let i = 0;
        i < allProcessedItems.length && imageIndex < processedItemImages.length;
        i++
      ) {
        const item = allProcessedItems[i];
        const processedImage = processedItemImages[imageIndex];

        // Check if this item title matches the image filename (without extension)
        if (item.title === processedImage.name) {
          item.hasImage = true;
          imageIndex++;
        }
      }

      {
        // Create sorter items without groups (flat mode)
        let imageIndex = 0;
        for (const item of allProcessedItems) {
          let finalImageUrl = item.imageUrl || null;
          let itemSlug = null;

          // Handle image upload if this item has an image
          if (item.hasImage && imageIndex < processedItemImages.length) {
            const processedImage = processedItemImages[imageIndex];

            itemSlug = generateSorterItemSlug(item.title);
            const uniqueId = generateUniqueFileId();
            const itemKey = getFlatItemKey(newSorter.id, itemSlug, uniqueId);
            const thumbKey = getFlatItemThumbKey(newSorter.id, itemSlug, uniqueId);

            // Upload main image and thumbnail to R2
            await uploadToR2(itemKey, processedImage.buffer, "image/jpeg");

            // Generate public URL with cache-busting timestamp
            const timestamp = Date.now();
            finalImageUrl = `${getR2PublicUrl(itemKey)}?t=${timestamp}`;

            imageIndex++;
          }

          await tx.insert(sorterItems).values({
            sorterId: newSorter.id,
            title: item.title,
            slug: itemSlug,
            imageUrl: finalImageUrl,
          });
        }
      }

      // Return the sorter data from transaction
      console.log(
        `✅ Sorter created successfully: ${newSorter.title} (${newSorter.slug})`,
      );
      return {
        sorter: newSorter,
      };
    });

    console.log("💾 Database transaction completed successfully");

    // Revalidate relevant paths for new sorter
    revalidatePath('/'); // Homepage shows popular sorters
    revalidatePath('/browse'); // Browse page shows all sorters
    revalidatePath(`/sorter/${result.sorter.slug}`); // New sorter page
    // Get user data for profile revalidation
    const creatorData = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, userData[0].id))
      .limit(1);
    
    if (creatorData.length > 0 && creatorData[0].username) {
      revalidatePath(`/user/${creatorData[0].username}`); // Creator's profile page
      console.log(`♻️ Revalidated paths for new sorter: ${result.sorter.slug}`);
    }

    return NextResponse.json({
      success: true,
      sorter: result.sorter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Error creating sorter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/sorters - Get popular sorters for homepage
export async function GET() {
  try {
    console.log("🏠 GET /api/sorters - Fetching popular sorters for homepage");

    const popularSorters = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        slug: sorters.slug,
        category: sorters.category,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        coverImageUrl: sorters.coverImageUrl,
        creatorUsername: user.username,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(eq(sorters.deleted, false))
      .orderBy(desc(sorters.completionCount))
      .limit(10);

    // Transform data to match expected format
    const transformedSorters = popularSorters.map((sorter) => ({
      ...sorter,
      creatorUsername: sorter.creatorUsername ?? "Unknown",
      category: sorter.category ?? undefined,
      coverImageUrl: sorter.coverImageUrl ?? undefined,
    }));

    console.log(
      `📊 GET /api/sorters - Found ${transformedSorters.length} popular sorters`,
    );

    return NextResponse.json({
      popularSorters: transformedSorters,
      total: transformedSorters.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ GET /api/sorters error:", error);
    return NextResponse.json(
      { error: "Failed to fetch popular sorters" },
      { status: 500 },
    );
  }
}
