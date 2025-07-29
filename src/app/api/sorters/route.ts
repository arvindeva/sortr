import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";

// Increase function timeout for R2 operations
export const maxDuration = 60;
import {
  sorters,
  sorterItems,
  sorterGroups,
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
    const copyOperations: Array<{ sourceKey: string; destKey: string; originalKey: string; isMainFile: boolean }> = []; // Track operations for parallel execution
    
    try {
      // Create temporary sorterId for key generation (we'll use a deterministic approach)
      const tempSorterId = `temp-${Date.now()}`;
      
      // Debug: Log the uploaded files we're starting with
      console.log(`Starting file collection with ${uploadedFiles.length} uploaded files:`);
      const filesByType = uploadedFiles.reduce((acc: Record<string, number>, file: UploadedFile) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Files by type:', filesByType);
      
      // Collect cover file operation
      const coverFile = uploadedFiles.find((f: UploadedFile) => f.type === "cover");
      let coverImageUrl: string | null = null;
      if (coverFile) {
        console.log(`Processing cover file: ${coverFile.originalName}`);
        const newKey = convertSessionKeyToSorterKey(coverFile.key, tempSorterId, 1, "cover");
        copyOperations.push({
          sourceKey: coverFile.key,
          destKey: newKey,
          originalKey: coverFile.key,
          isMainFile: true
        });
        coverImageUrl = getR2PublicUrl(newKey);
        fileUrlMappings.set(coverFile.key, coverImageUrl);
        console.log(`Added 1 cover operation. Total operations: ${copyOperations.length}`);
      }

    // Collect group cover file operations
    if (validatedData.useGroups && validatedData.groups) {
      const groupCoverFiles = uploadedFiles.filter((f: UploadedFile) => f.type === "group-cover");
      console.log(`Processing ${validatedData.groups.length} groups with ${groupCoverFiles.length} group cover files`);
      
      for (let groupIndex = 0; groupIndex < validatedData.groups.length; groupIndex++) {
        const groupCoverFile = groupCoverFiles.find((file: UploadedFile) => {
          const match = file.originalName.match(/^group-cover-(\d+)-/);
          if (match) {
            const fileGroupIndex = parseInt(match[1]);
            return fileGroupIndex === groupIndex;
          }
          return false;
        });

        if (groupCoverFile) {
          console.log(`Processing group cover ${groupIndex}: ${groupCoverFile.originalName}`);
          const newKey = convertSessionKeyToSorterKey(
            groupCoverFile.key,
            tempSorterId,
            1,
            `group-${groupIndex}-cover`,
          );
          copyOperations.push({
            sourceKey: groupCoverFile.key,
            destKey: newKey,
            originalKey: groupCoverFile.key,
            isMainFile: true
          });
          const groupCoverUrl = getR2PublicUrl(newKey);
          fileUrlMappings.set(groupCoverFile.key, groupCoverUrl);
          console.log(`Added 1 group cover operation. Total operations: ${copyOperations.length}`);
        }
      }
    }

    // Collect item file operations
    const itemFiles = uploadedFiles.filter((f: UploadedFile) => f.type === "item");
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
        console.warn(`File "${file.originalName}" does not have a unique ID suffix`);
      }
    });
    
    console.log(`Grouped files by unique ID: ${filesByUniqueId.size} unique files with ${itemFiles.length} total files`);
    
    if (validatedData.useGroups && validatedData.groups) {
      // Process grouped items
      console.log(`Processing grouped mode with ${validatedData.groups.length} groups`);
      
      for (const group of validatedData.groups) {
        console.log(`Processing group "${group.name}" with ${group.items.length} items`);
        
        for (const item of group.items) {
          // NEW: Use suffix-based correlation instead of name matching
          // Find files that match this item's title (after removing suffix)
          let matchingFiles: UploadedFile[] = [];
          let matchedUniqueId: string | null = null;
          
          // Find the unique ID for this item by checking original names (without suffix)
          for (const [uniqueId, files] of filesByUniqueId.entries()) {
            const sampleFile = files[0];
            const originalNameWithoutSuffix = removeIdFromFileName(sampleFile.originalName);
            const nameWithoutExt = originalNameWithoutSuffix.replace(/\.[^/.]+$/, "");
            
            if (nameWithoutExt === item.title) {
              matchingFiles = files;
              matchedUniqueId = uniqueId;
              break;
            }
          }

          console.log(`Item "${item.title}" matched ${matchingFiles.length} files with ID "${matchedUniqueId}":`, matchingFiles.map(f => f.originalName));

          if (matchingFiles.length > 0 && matchedUniqueId) {
            const itemSlug = generateSorterItemSlug(item.title, generateSorterItemSlug(group.name));
            
            for (const file of matchingFiles) {
              const newKey = convertSessionKeyToSorterKey(file.key, tempSorterId, 1, itemSlug);
              const isMainFile = !file.key.includes('-thumb');
              
              copyOperations.push({
                sourceKey: file.key,
                destKey: newKey,
                originalKey: file.key,
                isMainFile
              });
              
              console.log(`Added operation for ${file.originalName} -> ${newKey} (${isMainFile ? 'main' : 'thumb'}). Total operations: ${copyOperations.length}`);
              
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
    } else if (validatedData.items) {
      // Process traditional items
      console.log(`Processing traditional mode with ${validatedData.items.length} items`);
      
      for (const item of validatedData.items) {
        const itemSlug = generateSorterItemSlug(item.title);
        
        // NEW: Use suffix-based correlation instead of name matching
        // Find files that match this item's title (after removing suffix)
        let matchingFiles: UploadedFile[] = [];
        let matchedUniqueId: string | null = null;
        
        // Find the unique ID for this item by checking original names (without suffix)
        for (const [uniqueId, files] of filesByUniqueId.entries()) {
          const sampleFile = files[0];
          const originalNameWithoutSuffix = removeIdFromFileName(sampleFile.originalName);
          const nameWithoutExt = originalNameWithoutSuffix.replace(/\.[^/.]+$/, "");
          
          if (nameWithoutExt === item.title) {
            matchingFiles = files;
            matchedUniqueId = uniqueId;
            break;
          }
        }

        console.log(`Item "${item.title}" matched ${matchingFiles.length} files with ID "${matchedUniqueId}":`, matchingFiles.map(f => f.originalName));

        if (matchingFiles.length > 0 && matchedUniqueId) {
          for (const file of matchingFiles) {
            const newKey = convertSessionKeyToSorterKey(file.key, tempSorterId, 1, itemSlug);
            const isMainFile = !file.key.includes('-thumb');
            
            copyOperations.push({
              sourceKey: file.key,
              destKey: newKey,
              originalKey: file.key,
              isMainFile
            });
            
            console.log(`Added operation for ${file.originalName} -> ${newKey} (${isMainFile ? 'main' : 'thumb'}). Total operations: ${copyOperations.length}`);
            
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
    console.log(`Executing ${copyOperations.length} R2 copy operations in parallel`);
    const copyResults = await copyR2ObjectsInParallel(
      copyOperations.map(op => ({ sourceKey: op.sourceKey, destKey: op.destKey })),
      10 // Concurrency limit
    );
    
    // Check for failures
    const failedOperations = copyResults.filter(result => !result.success);
    if (failedOperations.length > 0) {
      console.error(`${failedOperations.length} R2 copy operations failed:`, failedOperations);
      throw new Error(`Failed to copy ${failedOperations.length} files to R2`);
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
          useGroups: validatedData.useGroups || false,
          userId: userData.id,
          coverImageUrl: null, // Will be updated if cover image exists
          version: 1, // Start with version 1
        })
        .returning();

      // NEW: Immediately add to sorterHistory as version 1
      await tx.insert(sorterHistory).values({
        sorterId: newSorter.id,
        title: newSorter.title,
        description: newSorter.description,
        coverImageUrl: null, // Will be updated if cover image exists
        version: 1,
      });

      let coverImageUrl: string | null = null;

      // Process uploaded files and convert session keys to sorter keys
      let currentItemIndex = 0;

      if (validatedData.useGroups && validatedData.groups) {
        // Handle grouped sorter
        const groupCoverFiles = uploadedFiles.filter(
          (f: UploadedFile) => f.type === "group-cover",
        );

        // Process groups sequentially to maintain correct file order
        for (
          let groupIndex = 0;
          groupIndex < validatedData.groups.length;
          groupIndex++
        ) {
          const group = validatedData.groups[groupIndex];
          // Find group cover file for this specific group
          const groupCoverFile = groupCoverFiles.find((file: UploadedFile) => {
            // Extract index from group-cover-{index}- prefix in originalName
            const match = file.originalName.match(/^group-cover-(\d+)-/);
            if (match) {
              const fileGroupIndex = parseInt(match[1]);
              return fileGroupIndex === groupIndex;
            }
            return false;
          });

          let groupCoverUrl: string | null = null;
          if (groupCoverFile) {
            // Use pre-computed URL from Phase 1
            groupCoverUrl = fileUrlMappings.get(groupCoverFile.key) || null;
          }

          // Create group
          const groupSlug = generateSorterItemSlug(group.name);
          const [newGroup] = await tx
            .insert(sorterGroups)
            .values({
              sorterId: newSorter.id,
              name: group.name,
              slug: groupSlug,
              coverImageUrl: groupCoverUrl,
            })
            .returning();

          // Create group items sequentially
          for (const item of group.items) {
            // Generate unique slug for this item (used for both R2 key and database)
            const itemSlug = generateSorterItemSlug(
              item.title,
              generateSorterItemSlug(group.name),
            );

            // CRITICAL FIX: Use pre-computed item-to-URL mapping instead of file matching
            const itemImageUrl = itemImageUrls.get(item.title) || null;

            await tx.insert(sorterItems).values({
              sorterId: newSorter.id,
              groupId: newGroup.id,
              title: item.title,
              slug: itemSlug,
              imageUrl: itemImageUrl,
            });
          }
        }
      } else if (validatedData.items) {
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

          await tx.insert(sorterItems).values({
            sorterId: newSorter.id,
            groupId: null,
            title: item.title,
            slug: itemSlug,
            imageUrl: itemImageUrl,
          });
        }
      }

      // Update sorter with cover image URL if exists (already processed in Phase 1)
      if (coverImageUrl) {
        await tx
          .update(sorters)
          .set({ coverImageUrl })
          .where(eq(sorters.id, newSorter.id));

        // Also update sorterHistory for version 1
        await tx
          .update(sorterHistory)
          .set({ coverImageUrl })
          .where(
            and(
              eq(sorterHistory.sorterId, newSorter.id),
              eq(sorterHistory.version, 1),
            ),
          );
      }

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
    const result = await db.transaction(async (tx) => {
      // Create sorter
      const [newSorter] = await tx
        .insert(sorters)
        .values({
          title: validatedData.title,
          description: validatedData.description || null,
          category: validatedData.category || null,
          slug: slug,
          useGroups: validatedData.useGroups || false,
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
      if (validatedData.useGroups && validatedData.groups) {
        for (const group of validatedData.groups) {
          for (const item of group.items) {
            allProcessedItems.push({
              title: item.title,
              imageUrl: item.imageUrl,
              groupName: group.name,
              hasImage: false, // Will be determined by matching with uploaded images
            });
          }
        }
      } else if (validatedData.items) {
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

      if (validatedData.useGroups) {
        // Generate unique slugs for all groups
        const groupNames = validatedData.groups?.map((group) => group.name) || [];
        const existingSlugs: string[] = [];
        const createdGroups: { [name: string]: string } = {}; // groupName -> groupId

        // Create groups first
        for (const groupName of groupNames) {
          if (!createdGroups[groupName]) {
            const slug = generateUniqueSlug(groupName, existingSlugs);
            existingSlugs.push(slug);

            const [newGroup] = await tx
              .insert(sorterGroups)
              .values({
                sorterId: newSorter.id,
                name: groupName,
                slug: slug,
              })
              .returning();

            createdGroups[groupName] = newGroup.id;
          }
        }

        // Process group cover images
        if (groupCoverFiles.length > 0) {
          let groupCoverIndex = 0;
          for (
            let i = 0;
            i < groupNames.length && groupCoverIndex < groupCoverFiles.length;
            i++
          ) {
            const groupName = groupNames[i];
            const groupCoverFile = groupCoverFiles[groupCoverIndex];

            if (groupCoverFile && createdGroups[groupName]) {
              // Get group slug for this group
              const groupSlug = existingSlugs[i];

              // Process cover image: crop to square and resize to 300x300
              const bytes = await groupCoverFile.arrayBuffer();
              const buffer = Buffer.from(bytes);
              const processedBuffer = await processCoverImage(buffer); // Reuse existing cover image processing

              // Generate versioned group cover key: [groupSlug--group-image]
              const groupCoverSlug = `${groupSlug}--group-image`;
              const groupCoverKey = getVersionedGroupKey(
                newSorter.id,
                groupCoverSlug,
                1,
              );

              // Upload to R2
              await uploadToR2(groupCoverKey, processedBuffer, "image/jpeg");

              // Generate public URL with cache-busting timestamp
              const timestamp = Date.now();
              const groupCoverUrl = `${getR2PublicUrl(groupCoverKey)}?t=${timestamp}`;

              // Update group with cover image URL
              await tx
                .update(sorterGroups)
                .set({ coverImageUrl: groupCoverUrl })
                .where(eq(sorterGroups.id, createdGroups[groupName]));

              groupCoverIndex++;
            }
          }
        }

        // Create items for each group
        let imageIndex = 0;
        for (const item of allProcessedItems) {
          if (item.groupName && createdGroups[item.groupName]) {
            let finalImageUrl = item.imageUrl || null;
            let itemSlug = null;

            // Handle image upload if this item has an image
            if (item.hasImage && imageIndex < processedItemImages.length) {
              const processedImage = processedItemImages[imageIndex];
              const groupSlug = existingSlugs.find(
                (slug, index) => groupNames[index] === item.groupName,
              );

              itemSlug = generateSorterItemSlug(item.title, groupSlug);
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
              groupId: createdGroups[item.groupName],
              title: item.title,
              slug: itemSlug,
              imageUrl: finalImageUrl,
            });
          }
        }
      } else {
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
            groupId: null,
            title: item.title,
            slug: itemSlug,
            imageUrl: finalImageUrl,
          });
        }
      }

      // Return the sorter data from transaction
      return {
        sorter: newSorter,
      };
    });

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
