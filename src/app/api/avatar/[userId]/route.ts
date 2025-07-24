import { NextRequest, NextResponse } from "next/server";
import { getAvatarKey, getR2PresignedUrl } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Generate the avatar key
    const avatarKey = getAvatarKey(userId);
    
    // Get presigned URL
    const presignedUrl = await getR2PresignedUrl(avatarKey);
    
    // Redirect to the presigned URL
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("Avatar fetch error:", error);
    return NextResponse.json(
      { error: "Avatar not found" }, 
      { status: 404 }
    );
  }
}