import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
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
} from "@/lib/r2";
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

/**
 * Copy a file from one R2 location to another (no processing)
 */
async function copyR2Object(sourceKey: string, destKey: string): Promise<void> {
  try {
    const { GetObjectCommand, PutObjectCommand } = await import(
      "@aws-sdk/client-s3"
    );

    // Get the object from the source location
    const sourceObject = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: sourceKey,
      }),
    );

    if (!sourceObject.Body) {
      throw new Error(`Source object not found: ${sourceKey}`);
    }

    // Convert the body to a buffer
    const bodyBytes = await sourceObject.Body.transformToByteArray();

    // Upload to the destination location (no processing)
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: destKey,
        Body: bodyBytes,
        ContentType: sourceObject.ContentType, // Preserve original content type
        CacheControl: "public, max-age=31536000", // 1 year cache
      }),
    );
  } catch (error) {
    console.error(
      `Failed to copy file from ${sourceKey} to ${destKey}:`,
      error,
    );
    throw error;
  }
}

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

    // Create the sorter
    const [newSorter] = await db
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
    await db.insert(sorterHistory).values({
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
          const newKey = convertSessionKeyToSorterKey(
            groupCoverFile.key,
            newSorter.id,
            1, // version 1
            `group-${groupIndex}-cover`,
          );

          // Copy file from session location to final location
          await copyR2Object(groupCoverFile.key, newKey);
          groupCoverUrl = getR2PublicUrl(newKey);
        }

        // Create group
        const groupSlug = generateSorterItemSlug(group.name);
        const [newGroup] = await db
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
          let itemImageUrl: string | null = null;

          // Generate unique slug for this item (used for both R2 key and database)
          const itemSlug = generateSorterItemSlug(
            item.title,
            generateSorterItemSlug(group.name),
          );

          // Find corresponding item file by name matching (like traditional sorters)
          const itemFiles = uploadedFiles.filter(
            (f: UploadedFile) => f.type === "item",
          );
          const itemFile = itemFiles.find((file: UploadedFile) => {
            const originalNameWithoutExt = file.originalName.replace(
              /\.[^/.]+$/,
              "",
            );
            return originalNameWithoutExt === item.title;
          });

          if (itemFile) {
            const newKey = convertSessionKeyToSorterKey(
              itemFile.key,
              newSorter.id,
              1, // version 1
              itemSlug,
            );

            // Copy file from session location to final location
            await copyR2Object(itemFile.key, newKey);
            itemImageUrl = getR2PublicUrl(newKey);
          }

          await db.insert(sorterItems).values({
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
        let itemImageUrl: string | null = null;

        // Generate unique slug for this item (used for both R2 key and database)
        const itemSlug = generateSorterItemSlug(item.title);

        // Find a file that matches this item's title
        // Remove file extension from original name to match with item title
        const itemFile = itemFiles.find((file: UploadedFile) => {
          const originalNameWithoutExt = file.originalName.replace(
            /\.[^/.]+$/,
            "",
          );
          return originalNameWithoutExt === item.title;
        });

        if (itemFile) {
          const newKey = convertSessionKeyToSorterKey(
            itemFile.key,
            newSorter.id,
            1, // version 1
            itemSlug,
          );

          // Copy file from session location to final location
          await copyR2Object(itemFile.key, newKey);
          itemImageUrl = getR2PublicUrl(newKey);
        }

        await db.insert(sorterItems).values({
          sorterId: newSorter.id,
          groupId: null,
          title: item.title,
          slug: itemSlug,
          imageUrl: itemImageUrl,
        });
      }
    }

    // Handle cover image
    const coverFile = uploadedFiles.find(
      (f: UploadedFile) => f.type === "cover",
    );
    if (coverFile) {
      const newKey = convertSessionKeyToSorterKey(
        coverFile.key,
        newSorter.id,
        1, // version 1
        "cover",
      );

      // Copy file from session location to final location
      await copyR2Object(coverFile.key, newKey);
      coverImageUrl = getR2PublicUrl(newKey);

      // Update sorter with cover image URL
      await db
        .update(sorters)
        .set({ coverImageUrl })
        .where(eq(sorters.id, newSorter.id));

      // NEW: Also update sorterHistory for version 1
      await db
        .update(sorterHistory)
        .set({ coverImageUrl })
        .where(
          and(
            eq(sorterHistory.sorterId, newSorter.id),
            eq(sorterHistory.version, 1),
          ),
        );
    }

    // Mark upload session as complete
    await completeUploadSession(sessionId);

    return NextResponse.json({
      id: newSorter.id,
      slug: newSorter.slug,
      title: newSorter.title,
      description: newSorter.description,
      category: newSorter.category,
      coverImageUrl,
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

    // Create sorter
    const [newSorter] = await db
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
    await db.insert(sorterHistory).values({
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
      await db
        .update(sorters)
        .set({ coverImageUrl: finalCoverUrl })
        .where(eq(sorters.id, newSorter.id));

      // NEW: Also update sorterHistory for version 1
      await db
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

          const [newGroup] = await db
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
            await db
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

          await db.insert(sorterItems).values({
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

        await db.insert(sorterItems).values({
          sorterId: newSorter.id,
          groupId: null,
          title: item.title,
          slug: itemSlug,
          imageUrl: finalImageUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sorter: newSorter,
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
