import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteFromR2, getAvatarKey } from "@/lib/r2";

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
      .select({ id: user.id, image: user.image, username: user.username })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userData[0].id;
    const currentImage = userData[0].image;
    const username = userData[0].username;

    // Check if user has an avatar to remove
    if (!currentImage) {
      return NextResponse.json(
        { error: "No avatar to remove" },
        { status: 400 },
      );
    }

    // Generate avatar key and delete from R2
    const avatarKey = getAvatarKey(userId);

    try {
      await deleteFromR2(avatarKey);
    } catch (error) {
      // If file doesn't exist in R2, we'll still proceed to update the database
      console.warn("Failed to delete avatar from R2:", error);
    }

    // Update user's image URL to null in database
    await db.update(user).set({ image: null }).where(eq(user.id, userId));


    return NextResponse.json({
      success: true,
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Avatar removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 },
    );
  }
}
