import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterGroups, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSorterSchema } from "@/lib/validations";
import { generateUniqueSlug, generateSorterSlug } from "@/lib/utils";
import { uploadToR2, getCoverKey, getR2PublicUrl } from "@/lib/r2";
import {
  processCoverImage,
  validateCoverImageBuffer,
} from "@/lib/image-processing";

const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

    // Check if request contains multipart form data (with cover image)
    const contentType = request.headers.get("content-type") || "";
    let validatedData;
    let coverImageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart form data (with potential cover image)
      const formData = await request.formData();
      const dataJson = formData.get("data") as string;
      coverImageFile = formData.get("coverImage") as File | null;

      if (!dataJson) {
        return NextResponse.json(
          { error: "Missing sorter data" },
          { status: 400 },
        );
      }

      const body = JSON.parse(dataJson);
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

    if (validatedData.useGroups && validatedData.groups) {
      // Generate unique slugs for all groups
      const groupNames = validatedData.groups.map((group) => group.name);
      const existingSlugs: string[] = [];

      // Create groups and their items
      for (const group of validatedData.groups) {
        const slug = generateUniqueSlug(group.name, existingSlugs);
        existingSlugs.push(slug);

        const [newGroup] = await db
          .insert(sorterGroups)
          .values({
            sorterId: newSorter.id,
            name: group.name,
            slug: slug,
          })
          .returning();

        // Create items for this group
        await db.insert(sorterItems).values(
          group.items.map((item) => ({
            sorterId: newSorter.id,
            groupId: newGroup.id,
            title: item.title,
            imageUrl: item.imageUrl || null,
          })),
        );
      }
    } else {
      // Create sorter items without groups (traditional mode)
      if (validatedData.items) {
        await db.insert(sorterItems).values(
          validatedData.items.map((item) => ({
            sorterId: newSorter.id,
            groupId: null,
            title: item.title,
            imageUrl: item.imageUrl || null,
          })),
        );
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
