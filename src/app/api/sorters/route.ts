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
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createSorterSchema } from "@/lib/validations";
import {
  generateUniqueSlug,
  generateSorterSlug,
  generateSorterItemSlug,
  generateUniqueTagSlug,
  validateTagName,
} from "@/lib/utils";
import {
  uploadToR2,
  getCoverKey,
  getSorterItemKey,
  getR2PublicUrl,
  convertSessionKeyToSorterKey,
  getVersionedCoverKey,
  getVersionedItemKey,
  getVersionedGroupKey,
  r2Client,
  copyR2ObjectsInParallel,
} from "@/lib/r2";
import { extractIdFromFileName, removeIdFromFileName } from "@/lib/utils";
import {
  getUploadSession,
  getSessionFiles,
  completeUploadSession,
} from "@/lib/session-manager";
import type { UploadedFile } from "@/types/upload";
import {
  processCoverImage,
  validateCoverImageBuffer,
  processSorterItemImage,
  validateSorterItemImageBuffer,
} from "@/lib/image-processing";
import { revalidateAfterSorterChange } from "@/lib/revalidation";

const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ITEM_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_ITEM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function handleUploadSessionRequest(body: any, userData: any) {
  const { uploadSession: sessionId, uploadedFiles, ...sorterData } = body;

  try {
    // Validate upload session
    const session = await getUploadSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 400 },
      );
    }

    // Validate session ownership
    if (session.userId !== userData.id) {
      return NextResponse.json(
        { error: "Upload session does not belong to current user" },
        { status: 403 },
      );
    }

    // We can work directly with the uploaded files from the request
    // since they contain the R2 keys and file information
    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "No files found in upload session" },
        { status: 400 },
      );
    }

    // Validate sorter data
    const validatedData = createSorterSchema.parse(sorterData);

    // Generate slug for sorter
    const slug = generateSorterSlug(validatedData.title);

    // Get existing slugs to ensure uniqueness
    const existingSorters = await db
      .select({ slug: sorters.slug })
      .from(sorters);
    const existingSlugs = existingSorters.map((s) => s.slug);

    // Phase 1: Collect all R2 copy operations, then execute in parallel
    const fileUrlMappings = new Map<string, string>(); // originalKey -> publicUrl
    const itemImageUrls = new Map<string, string>(); // itemTitle -> imageUrl (for database transaction)
    const copyOperations: Array<{
      sourceKey: string;
      destKey: string;
      originalKey: string;
      isMainFile: boolean;
    }> = []; // Track operations for parallel execution

    // CRITICAL FIX: Declare coverImageUrl at function scope so it's accessible in the database transaction
    let coverImageUrl: string | null = null;

    try {
      // Create temporary sorterId for key generation (we'll use a deterministic approach)
      const tempSorterId = `temp-${Date.now()}`;

      // Debug: Log the uploaded files we're starting with
      console.log(
        `Starting file collection with ${uploadedFiles.length} uploaded files:`,
      );
      const filesByType = uploadedFiles.reduce(
        (acc: Record<string, number>, file: UploadedFile) => {
          acc[file.type] = (acc[file.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      console.log("Files by type:", filesByType);

      // Collect cover file operation
      const coverFile = uploadedFiles.find(
        (f: UploadedFile) => f.type === "cover",
      );
      if (coverFile) {
        console.log(`Processing cover file: ${coverFile.originalName}`);
        const newKey = convertSessionKeyToSorterKey(
          coverFile.key,
          tempSorterId,
          1,
          "cover",
        );
        copyOperations.push({
          sourceKey: coverFile.key,
          destKey: newKey,
          originalKey: coverFile.key,
          isMainFile: true,
        });
        coverImageUrl = getR2PublicUrl(newKey);
        fileUrlMappings.set(coverFile.key, coverImageUrl);
        console.log(
          `Added 1 cover operation. Total operations: ${copyOperations.length}`,
        );
      }


      // Collect item file operations
      const itemFiles = uploadedFiles.filter(
        (f: UploadedFile) => f.type === "item",
      );
      console.log(`Processing ${itemFiles.length} item files`);

      // CRITICAL FIX: Group files by unique suffix instead of name-based matching
      // Each file now has a unique suffix (e.g., "alice-a1b2c3.png") for proper correlation
      const filesByUniqueId = new Map<string, UploadedFile[]>();

      itemFiles.forEach((file: UploadedFile) => {
        const uniqueId = extractIdFromFileName(file.originalName);
        if (uniqueId) {
          if (!filesByUniqueId.has(uniqueId)) {
            filesByUniqueId.set(uniqueId, []);
          }
          filesByUniqueId.get(uniqueId)!.push(file);
        } else {
          console.warn(
            `File "${file.originalName}" does not have a unique ID suffix`,
          );
        }
      });

      console.log(
        `Grouped files by unique ID: ${filesByUniqueId.size} unique files with ${itemFiles.length} total files`,
      );

      if (validatedData.items) {
        // Process traditional items
        console.log(
          `Processing traditional mode with ${validatedData.items.length} items`,
        );

        for (const item of validatedData.items) {
          const itemSlug = generateSorterItemSlug(item.title);

          // NEW: Use suffix-based correlation instead of name matching
          // Find files that match this item's title (after removing suffix)
          let matchingFiles: UploadedFile[] = [];
          let matchedUniqueId: string | null = null;

          // Find the unique ID for this item by checking original names (without suffix)
          for (const [uniqueId, files] of filesByUniqueId.entries()) {
            const sampleFile = files[0];
            const originalNameWithoutSuffix = removeIdFromFileName(
              sampleFile.originalName,
            );
            const nameWithoutExt = originalNameWithoutSuffix.replace(
              /\.[^/.]+$/,
              "",
            );

            if (nameWithoutExt === item.title) {
              matchingFiles = files;
              matchedUniqueId = uniqueId;
              break;
            }
          }

          console.log(
            `Item "${item.title}" matched ${matchingFiles.length} files with ID "${matchedUniqueId}":`,
            matchingFiles.map((f) => f.originalName),
          );

          if (matchingFiles.length > 0 && matchedUniqueId) {
            for (const file of matchingFiles) {
              const newKey = convertSessionKeyToSorterKey(
                file.key,
                tempSorterId,
                1,
                itemSlug,
              );
              const isMainFile = !file.key.includes("-thumb");

              copyOperations.push({
                sourceKey: file.key,
                destKey: newKey,
                originalKey: file.key,
                isMainFile,
              });

              console.log(
                `Added operation for ${file.originalName} -> ${newKey} (${isMainFile ? "main" : "thumb"}). Total operations: ${copyOperations.length}`,
              );

              if (isMainFile) {
                const itemImageUrl = getR2PublicUrl(newKey);
                fileUrlMappings.set(file.key, itemImageUrl);
                // CRITICAL FIX: Store item title -> imageUrl mapping for database transaction
                itemImageUrls.set(item.title, itemImageUrl);
              }
            }

            // Remove this unique ID from the map to prevent reuse
            filesByUniqueId.delete(matchedUniqueId);
          }
        }
      }

      // Execute all R2 copy operations in parallel
      console.log(
        `Executing ${copyOperations.length} R2 copy operations in parallel`,
      );
      const copyResults = await copyR2ObjectsInParallel(
        copyOperations.map((op) => ({
          sourceKey: op.sourceKey,
          destKey: op.destKey,
        })),
        10, // Concurrency limit
      );

      // Check for failures
      const failedOperations = copyResults.filter((result) => !result.success);
      if (failedOperations.length > 0) {
        console.error(
          `${failedOperations.length} R2 copy operations failed:`,
          failedOperations,
        );
        throw new Error(
          `Failed to copy ${failedOperations.length} files to R2`,
        );
      }
    } catch (error) {
      // R2 operations failed
      console.error("R2 operations failed during sorter creation:", error);
      throw new Error("Failed to process uploaded files");
    }

    // Phase 2: Fast database transaction with pre-computed URLs
    const result = await db.transaction(async (tx) => {
      // Create the sorter
      const [newSorter] = await tx
        .insert(sorters)
        .values({
          title: validatedData.title,
          slug: generateUniqueSlug(slug, existingSlugs),
          description: validatedData.description || null,
          category: validatedData.category || null,
          userId: userData.id,
          coverImageUrl, // Use pre-computed cover image URL from Phase 1
          version: 1, // Start with version 1
        })
        .returning();

      // NEW: Immediately add to sorterHistory as version 1
      await tx.insert(sorterHistory).values({
        sorterId: newSorter.id,
        title: newSorter.title,
        description: newSorter.description,
        coverImageUrl, // Use pre-computed cover image URL from Phase 1
        version: 1,
      });

      // Create tags if provided (support for tag-based sorters with images)
      const createdTagSlugs = new Map<string, string>(); // tagName -> slug
      if (validatedData.tags && validatedData.tags.length > 0) {
        console.log(`Creating ${validatedData.tags.length} tags for sorter`);
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
          console.log(`Created tag: ${tag.name} -> ${tagSlug}`);
        }
      }

      // Process uploaded files and convert session keys to sorter keys
      let currentItemIndex = 0;

      if (validatedData.items) {
        // Handle traditional sorter
        const itemFiles = uploadedFiles.filter(
          (f: UploadedFile) => f.type === "item",
        );

        // Sort item files by their session index to ensure correct order
        itemFiles.sort((a: UploadedFile, b: UploadedFile) => {
          const indexA = parseInt(a.key.match(/\/item\/(\d+)\./)?.[1] || "0");
          const indexB = parseInt(b.key.match(/\/item\/(\d+)\./)?.[1] || "0");
          return indexA - indexB;
        });

        // Process items and match them to files by original name
        // The files are created from uploaded images, and items should match those original names

        for (const item of validatedData.items) {
          // Generate unique slug for this item (used for both R2 key and database)
          const itemSlug = generateSorterItemSlug(item.title);

          // CRITICAL FIX: Use pre-computed item-to-URL mapping instead of file matching
          const itemImageUrl = itemImageUrls.get(item.title) || null;

          // Convert tag names to tag slugs for this item
          const itemTagSlugs: string[] = [];
          if (item.tagSlugs && item.tagSlugs.length > 0) {
            for (const tagName of item.tagSlugs) {
              const tagSlug = createdTagSlugs.get(tagName);
              if (tagSlug) {
                itemTagSlugs.push(tagSlug);
              }
            }
          }

          await tx.insert(sorterItems).values({
            sorterId: newSorter.id,
            title: item.title,
            slug: itemSlug,
            imageUrl: itemImageUrl,
            tagSlugs: itemTagSlugs,
          });
        }
      }

      // Cover image URL is already set during sorter creation above
      // No need to update it separately since it was pre-computed in Phase 1

      // Return data from transaction
      return {
        newSorter: {
          ...newSorter,
          coverImageUrl,
        },
      };
    });

    // Mark upload session as complete (outside transaction)
    await completeUploadSession(sessionId);

    // Revalidate caches that show sorter data
    try {
      await revalidateAfterSorterChange({
        username: userData.username || undefined,
        includeBrowse: true,
      });
    } catch (revalidateError) {
      console.error("❌ Failed to revalidate caches (upload session path):", revalidateError);
      // Don't fail the entire request if revalidation fails
    }

    return NextResponse.json({
      id: result.newSorter.id,
      slug: result.newSorter.slug,
      title: result.newSorter.title,
      description: result.newSorter.description,
      category: result.newSorter.category,
      coverImageUrl: result.newSorter.coverImageUrl,
      message: "Sorter created successfully with uploaded files",
    });
  } catch (error) {
    console.error("Error creating sorter with upload session:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create sorter" },
      { status: 500 },
    );
  }
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
      // Create the sorter (without useGroups field)
      const [newSorter] = await tx
        .insert(sorters)
        .values({
          title: validatedData.title,
          description: validatedData.description || null,
          category: validatedData.category || null,
          slug: slug,
          coverImageUrl: validatedData.coverImageUrl || null,
          userId: userData.id,
          version: 1,
          // Note: useGroups field removed from schema
        })
        .returning();

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
            imageUrl: item.imageUrl || null,
            tagSlugs: actualTagSlugs, // Array of tag slugs
            version: 1,
          });
        }
      }

      return { sorter: newSorter };
    });

    console.log(`✅ Tag-based sorter created: ${result.sorter.title} (${result.sorter.slug})`);

    // Revalidate caches
    try {
      await revalidateAfterSorterChange({
        username: userData.username || undefined,
        includeBrowse: true,
      });
    } catch (revalidateError) {
      console.error("❌ Failed to revalidate caches:", revalidateError);
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

        // Generate versioned cover key and upload processed image to R2
        const coverKey = getVersionedCoverKey(newSorter.id, 1);
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
            const itemKey = getVersionedItemKey(newSorter.id, itemSlug, 1);

            // Upload to R2
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
      console.log(`✅ Sorter created successfully: ${newSorter.title} (${newSorter.slug})`);
      return {
        sorter: newSorter,
      };
    });
    
    console.log("💾 Database transaction completed successfully");

    // Revalidate caches that show sorter data
    try {
      await revalidateAfterSorterChange({
        username: userData[0].username || undefined,
        includeBrowse: true,
      });
    } catch (revalidateError) {
      console.error("❌ Failed to revalidate caches:", revalidateError);
      // Don't fail the entire request if revalidation fails
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
