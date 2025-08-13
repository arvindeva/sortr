import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sorters, uploadBatches } from "@/db/schema";
import {
  generatePresignedUploadUrl,
  getFlatCoverKey,
  getFlatItemKey,
  getFlatItemThumbKey,
  generateUniqueFileId,
} from "@/lib/r2";
import { generateSorterItemSlug, generateSorterSlug } from "@/lib/utils";
import { eq } from "drizzle-orm";

type InitBody = {
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: { name: string; sortOrder?: number }[];
  items: { title: string; tagNames?: string[]; hasImage?: boolean }[];
  includeCover?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: InitBody = await req.json();
    if (!body?.title || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Resolve current user id from session (set by auth callbacks)
    const userId = (session.user as any)?.id;
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Create draft sorter with random-suffix slug to avoid collisions
    const slug = generateSorterSlug(body.title);
    const [draft] = await db
      .insert(sorters)
      .values({
        title: body.title,
        description: body.description || null,
        category: body.category || null,
        slug,
        userId,
        coverImageUrl: null,
        version: 1,
        status: "draft",
      })
      .returning();

    const sorterId = draft.id;
    const version = 1;

    // Build keys and presigned PUT URLs
    const expectedKeys: { key: string; type: "cover" | "item" | "thumb"; itemIndex?: number }[] = [];
    const itemSlugs: string[] = [];

    // Cover (optional)
    let coverKey: string | null = null;
    if (body.includeCover) {
      const uid = generateUniqueFileId();
      coverKey = getFlatCoverKey(sorterId, uid);
      expectedKeys.push({ key: coverKey, type: "cover" });
    }

    // Items (main + thumb)
    body.items.forEach((it, idx) => {
      const slug = generateSorterItemSlug(it.title);
      itemSlugs.push(slug);
      if (it.hasImage) {
        const uid = generateUniqueFileId();
        const mainKey = getFlatItemKey(sorterId, slug, uid);
        const thumbKey = getFlatItemThumbKey(sorterId, slug, uid);
        expectedKeys.push({ key: mainKey, type: "item", itemIndex: idx });
        expectedKeys.push({ key: thumbKey, type: "thumb", itemIndex: idx });
      }
    });

    // Presign all expected keys
    const presigned: Record<string, string> = {};
    await Promise.all(
      expectedKeys.map(async ({ key }) => {
        presigned[key] = await generatePresignedUploadUrl(key, "image/jpeg");
      }),
    );

    // Create upload batch (48h TTL)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [batch] = await db
      .insert(uploadBatches)
      .values({
        sorterId,
        expectedCount: expectedKeys.length,
        uploadedCount: 0,
        status: "pending",
        expiresAt,
        metadata: {
          title: body.title,
          description: body.description || null,
          category: body.category || null,
          tags: body.tags || [],
          items: body.items,
          itemSlugs,
          includeCover: !!body.includeCover,
          coverKey,
          expectedKeys,
        },
      })
      .returning();

    return Response.json({
      sorterId,
      version,
      uploadBatchId: batch.id,
      slug,
      keys: expectedKeys,
      presigned,
    });
  } catch (error) {
    console.error("Error initializing sorter:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
