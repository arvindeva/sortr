import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterGroups, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSorterSchema } from "@/lib/validations";
import { generateUniqueSlug, generateSorterSlug, generateSorterItemSlug } from "@/lib/utils";
import { uploadToR2, getCoverKey, getSorterItemKey, getR2PublicUrl } from "@/lib/r2";
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
        key.startsWith("itemImage_")
      );
      itemImageFiles = itemImageEntries.map(([, file]) => file as File);

      // Collect all group cover images - they come with keys like "groupCover_0", "groupCover_1", etc.
      const groupCoverEntries = Array.from(formData.entries()).filter(([key]) => 
        key.startsWith("groupCover_")
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

    // Validate and process item images if provided
    const processedItemImages: { file: File; buffer: Buffer; name: string }[] = [];
    for (const itemImageFile of itemImageFiles) {
      // Validate file type
      if (!ALLOWED_ITEM_IMAGE_TYPES.includes(itemImageFile.type)) {
        return NextResponse.json(
          {
            error: `Only JPG, PNG, and WebP files are allowed for item images. Invalid file: ${itemImageFile.name}`,
          },
          { status: 400 },
        );
      }

      // Validate file size
      if (itemImageFile.size > MAX_ITEM_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Item image size must be less than 5MB. Invalid file: ${itemImageFile.name}` },
          { status: 400 },
        );
      }

      // Convert file to buffer
      const bytes = await itemImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate image buffer
      const isValidImage = await validateSorterItemImageBuffer(buffer);
      if (!isValidImage) {
        return NextResponse.json(
          { error: `Invalid item image format or dimensions: ${itemImageFile.name}` },
          { status: 400 },
        );
      }

      // Process image: crop to square and resize to 300x300
      const processedBuffer = await processSorterItemImage(buffer);
      
      // Extract item name from filename (remove extension)
      const itemName = itemImageFile.name.replace(/\.[^/.]+$/, "");
      
      processedItemImages.push({
        file: itemImageFile,
        buffer: processedBuffer,
        name: itemName,
      });
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
      })
      .returning();

    // Upload cover image if provided
    if (coverImageFile && coverImageUrl === "PLACEHOLDER") {
      const bytes = await coverImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const processedBuffer = await processCoverImage(buffer);

      // Generate cover key and upload processed image to R2
      const coverKey = getCoverKey(newSorter.id);
      await uploadToR2(coverKey, processedBuffer, "image/jpeg");

      // Generate R2 public URL with cache-busting timestamp
      const timestamp = Date.now();
      const finalCoverUrl = `${getR2PublicUrl(coverKey)}?t=${timestamp}`;

      // Update the sorter with the real cover image URL
      await db
        .update(sorters)
        .set({ coverImageUrl: finalCoverUrl })
        .where(eq(sorters.id, newSorter.id));

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
    for (let i = 0; i < allProcessedItems.length && imageIndex < processedItemImages.length; i++) {
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
        for (let i = 0; i < groupNames.length && groupCoverIndex < groupCoverFiles.length; i++) {
          const groupName = groupNames[i];
          const groupCoverFile = groupCoverFiles[groupCoverIndex];
          
          if (groupCoverFile && createdGroups[groupName]) {
            // Get group slug for this group
            const groupSlug = existingSlugs[i];
            
            // Process cover image: crop to square and resize to 300x300
            const bytes = await groupCoverFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const processedBuffer = await processCoverImage(buffer); // Reuse existing cover image processing
            
            // Generate group cover key: [groupSlug--group-image]
            const groupCoverSlug = `${groupSlug}--group-image`;
            const groupCoverKey = getSorterItemKey(newSorter.id, groupCoverSlug); // Reuse existing key generation
            
            // Upload to R2
            await uploadToR2(groupCoverKey, processedBuffer, "image/jpeg");
            
            // Generate public URL with cache-busting timestamp
            const timestamp = Date.now();
            const groupCoverUrl = `${getR2PublicUrl(groupCoverKey)}?t=${timestamp}`;
            
            // Update group with cover image URL
            await db.update(sorterGroups)
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
            const groupSlug = existingSlugs.find((slug, index) => 
              groupNames[index] === item.groupName
            );
            
            itemSlug = generateSorterItemSlug(item.title, groupSlug);
            const itemKey = getSorterItemKey(newSorter.id, itemSlug);
            
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
          const itemKey = getSorterItemKey(newSorter.id, itemSlug);
          
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
