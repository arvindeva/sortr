import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sorters, uploadBatches } from "@/db/schema";
import {
  generatePresignedUploadUrl,
  getR2PublicUrl,
  getFlatCoverKey,
  getFlatItemKeyStable,
  getFlatItemThumbKeyStable,
  generateUniqueFileId,
} from "@/lib/r2";
import { and, eq } from "drizzle-orm";
import { generateSorterItemSlug } from "@/lib/utils";

type InitBody = {
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: { id?: string; name: string; sortOrder?: number }[];
  items: { title: string; tagNames?: string[]; hasImage?: boolean }[];
  includeCover?: boolean;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body: InitBody = await req.json();

    if (!body?.title || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Find existing sorter by slug and verify ownership
    const sorterRow = await db.query.sorters.findFirst({
      where: and(eq(sorters.slug, slug), eq(sorters.deleted, false)),
    });
    if (!sorterRow) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }
    if (sorterRow.userId !== (session.user as any).id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const sorterId = sorterRow.id;

    // Build expected keys and presigned URLs (flat structure, only for changed assets)
    const expectedKeys: { key: string; type: "cover" | "item" | "thumb"; itemIndex?: number }[] = [];
    const itemSlugs: string[] = [];

    // Cover (optional)
    let coverKey: string | null = null;
    if (body.includeCover) {
      const uid = generateUniqueFileId();
      coverKey = getFlatCoverKey(sorterId, uid);
      expectedKeys.push({ key: coverKey, type: "cover" });
    }

    // Items (main + thumb) only for those with hasImage=true
    body.items.forEach((it, idx) => {
      const slug = generateSorterItemSlug(it.title);
      itemSlugs.push(slug);
      if (it.hasImage) {
        const mainKey = getFlatItemKeyStable(sorterId, slug);
        const thumbKey = getFlatItemThumbKeyStable(sorterId, slug);
        expectedKeys.push({ key: mainKey, type: "item", itemIndex: idx });
        expectedKeys.push({ key: thumbKey, type: "thumb", itemIndex: idx });
      }
    });

    // Presign PUT URLs for all expected keys
    const presigned: Record<string, string> = {};
    await Promise.all(
      expectedKeys.map(async ({ key }) => {
        presigned[key] = await generatePresignedUploadUrl(key, "image/jpeg");
      }),
    );

    // Store batch with 48h TTL and metadata needed for finalize
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
          mode: "edit",
          title: body.title,
          description: body.description || null,
          category: body.category || null,
          tags: (body.tags || []).map((t) => ({ name: t.name, sortOrder: t.sortOrder || 0 })),
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
      slug: sorterRow.slug,
      uploadBatchId: batch.id,
      keys: expectedKeys,
      presigned,
    });
  } catch (error) {
    console.error("Error initializing edit batch:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
