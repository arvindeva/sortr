import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterTags, sorterHistory, uploadBatches } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { r2Client, getR2PublicUrl } from "@/lib/r2";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { uploadBatchId } = await req.json();
    if (!uploadBatchId) {
      return Response.json({ error: "Missing uploadBatchId" }, { status: 400 });
    }

    // Load sorter by id OR slug (client passes id currently)
    const sorterRow = await db.query.sorters.findFirst({
      where: and(
        or(eq(sorters.id, slug as any), eq(sorters.slug, slug)),
        eq(sorters.deleted, false),
      ),
    });
    if (!sorterRow) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }
    if (sorterRow.userId !== (session.user as any).id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load batch
    const batch = await db.query.uploadBatches.findFirst({
      where: and(eq(uploadBatches.id, uploadBatchId), eq(uploadBatches.sorterId, sorterRow.id)),
    });
    if (!batch || !batch.metadata) {
      return Response.json({ error: "Upload batch not found" }, { status: 404 });
    }

    const expected: { key: string; type: string; itemIndex?: number }[] =
      (batch.metadata as any).expectedKeys || [];
    if (expected.length === 0) {
      return Response.json({ error: "No expected keys to verify" }, { status: 400 });
    }

    // Verify presence of each object with HEAD
    const BUCKET = process.env.R2_BUCKET!;
    const missing: string[] = [];
    await Promise.all(
      expected.map(async ({ key }) => {
        try {
          await r2Client.send(
            new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
          );
        } catch {
          missing.push(key);
        }
      }),
    );

    if (missing.length > 0) {
      return Response.json({ status: "pending", missing }, { status: 409 });
    }

    // All present: write DB data inside a transaction
    const meta: any = batch.metadata;
    await db.transaction(async (trx) => {
      // Create tags
      const tagNameToSlug = new Map<string, string>();
      if (Array.isArray(meta.tags) && meta.tags.length > 0) {
        for (const t of meta.tags) {
          const [tag] = await trx
            .insert(sorterTags)
            .values({
              sorterId: sorterRow.id,
              name: t.name,
              slug: t.name.toLowerCase().replace(/\s+/g, "-"),
              sortOrder: t.sortOrder || 0,
            })
            .returning();
          tagNameToSlug.set(t.name, tag.slug);
        }
      }

      // Items
      const version = sorterRow.version || 1;
      for (let i = 0; i < meta.items.length; i++) {
        const item = meta.items[i];
        const itemSlug: string = meta.itemSlugs[i];
        const mainEntry = expected.find(
          (e) => e.type === "item" && e.itemIndex === i,
        );
        const imageUrl = mainEntry ? getR2PublicUrl(mainEntry.key) : null;
        const tagSlugs = (item.tagNames || [])
          .map((name: string) => tagNameToSlug.get(name))
          .filter(Boolean);

        await trx.insert(sorterItems).values({
          sorterId: sorterRow.id,
          title: item.title,
          slug: itemSlug,
          imageUrl,
          tagSlugs,
          version,
        });
      }

      // Cover and sorter activation
      const coverKey: string | null = meta.coverKey || null;
      const coverImageUrl = coverKey ? getR2PublicUrl(coverKey) : sorterRow.coverImageUrl;

      await trx
        .update(sorters)
        .set({
          title: meta.title || sorterRow.title,
          description: meta.description ?? sorterRow.description,
          category: meta.category ?? sorterRow.category,
          coverImageUrl,
          status: "active",
          version: 1,
        })
        .where(eq(sorters.id, sorterRow.id));

      await trx.insert(sorterHistory).values({
        sorterId: sorterRow.id,
        title: meta.title || sorterRow.title,
        description: meta.description ?? sorterRow.description,
        coverImageUrl,
        version: 1,
      });
    });

    await db
      .update(uploadBatches)
      .set({ status: "active" })
      .where(eq(uploadBatches.id, uploadBatchId));

    return Response.json({ status: "active", missing: [] });
  } catch (error) {
    console.error("Error finalizing sorter:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
