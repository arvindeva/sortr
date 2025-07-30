import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // Verify secret for security
    const secret = request.headers.get("x-revalidation-secret");
    
    if (!secret || secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: "Invalid revalidation secret" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tag, tags } = body;

    // Validate that we have at least one tag
    if (!tag && (!tags || !Array.isArray(tags) || tags.length === 0)) {
      return NextResponse.json(
        { error: "At least one tag must be provided" },
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