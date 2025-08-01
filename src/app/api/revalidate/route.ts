import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // Verify secret for security
    const secret = request.headers.get("x-revalidation-secret");
    const validSecrets = [
      process.env.REVALIDATION_SECRET, // Production secret
      process.env.NODE_ENV === "development" ? "dev-cleanup" : null, // Dev-only secret
    ].filter(Boolean);
    
    if (!secret || !validSecrets.includes(secret)) {
      return NextResponse.json(
        { error: "Invalid revalidation secret" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tag, tags, path, paths } = body;

    // Validate that we have at least one tag or path
    if (!tag && (!tags || !Array.isArray(tags) || tags.length === 0) && 
        !path && (!paths || !Array.isArray(paths) || paths.length === 0)) {
      return NextResponse.json(
        { error: "At least one tag or path must be provided" },
        { status: 400 }
      );
    }

    // Revalidate single tag
    if (tag) {
      revalidateTag(tag);
    }

    // Revalidate multiple tags
    if (tags && Array.isArray(tags)) {
      tags.forEach((t) => {
        if (typeof t === "string" && t.length > 0) {
          revalidateTag(t);
        }
      });
    }

    // Revalidate single path
    if (path) {
      revalidatePath(path);
    }

    // Revalidate multiple paths
    if (paths && Array.isArray(paths)) {
      paths.forEach((p) => {
        if (typeof p === "string" && p.length > 0) {
          revalidatePath(p);
        }
      });
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate cache" },
      { status: 500 }
    );
  }
}