import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadToR2, getAvatarKey, getR2PublicUrl } from "@/lib/r2";
import {
  processAvatarImage,
  validateImageBuffer,
} from "@/lib/image-processing";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user data
    const userData = await db
      .select({ id: user.id, username: user.username })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userData[0].id;
    const username = userData[0].username;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 1MB" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate image buffer
    const isValidImage = await validateImageBuffer(buffer);
    if (!isValidImage) {
      return NextResponse.json(
        { error: "Invalid image format or dimensions" },
        { status: 400 },
      );
    }

    // Process image: crop to square and resize to 200x200
    const processedBuffer = await processAvatarImage(buffer);

    // Generate avatar key and upload processed image to R2
    const avatarKey = getAvatarKey(userId);
    await uploadToR2(avatarKey, processedBuffer, "image/jpeg");

    // Generate R2 public URL with cache-busting timestamp
    const timestamp = Date.now();
    const avatarUrl = `${getR2PublicUrl(avatarKey)}?t=${timestamp}`;

    // Update user's image URL in database
    await db.update(user).set({ image: avatarUrl }).where(eq(user.id, userId));


    return NextResponse.json({
      success: true,
      avatarUrl,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 },
    );
  }
}
