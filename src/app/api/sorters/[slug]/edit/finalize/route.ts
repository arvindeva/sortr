import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterTags, sorterHistory, uploadBatches, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { r2Client, getR2PublicUrl } from "@/lib/r2";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { generateSorterItemSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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

    // Load target sorter
    const sorterRow = await db.query.sorters.findFirst({
      where: and(eq(sorters.slug, slug), eq(sorters.deleted, false)),
    });
    if (!sorterRow) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }
    if (sorterRow.userId !== (session.user as any).id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load upload batch
    const batch = await db.query.uploadBatches.findFirst({
      where: and(eq(uploadBatches.id, uploadBatchId), eq(uploadBatches.sorterId, sorterRow.id)),
    });
    if (!batch || !batch.metadata) {
      return Response.json({ error: "Upload batch not found" }, { status: 404 });
    }

    const meta: any = batch.metadata;
    const expected: { key: string; type: string; itemIndex?: number }[] =
      meta.expectedKeys || [];

    // Verify all expected objects exist
    const BUCKET = process.env.R2_BUCKET!;
    const missing: string[] = [];
    await Promise.all(
      expected.map(async ({ key }) => {
        try {
          await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        } catch {
          missing.push(key);
        }
      }),
    );

    if (missing.length > 0) {
      return Response.json({ status: "pending", missing }, { status: 409 });
    }

    // Snapshot current items for image reuse when hasImage=false
    const currentItems = await db
      .select({ id: sorterItems.id, title: sorterItems.title, imageUrl: sorterItems.imageUrl, version: sorterItems.version })
      .from(sorterItems)
      .where(eq(sorterItems.sorterId, sorterRow.id));

    const newVersion = (sorterRow.version || 1) + 1;

    await db.transaction(async (trx) => {
      // Archive current version to history if not already archived
      const historyExists = await trx
        .select({ id: sorterHistory.id })
        .from(sorterHistory)
        .where(and(eq(sorterHistory.sorterId, sorterRow.id), eq(sorterHistory.version, sorterRow.version)))
        .limit(1);
      if (historyExists.length === 0) {
        await trx.insert(sorterHistory).values({
          sorterId: sorterRow.id,
          title: sorterRow.title,
          description: sorterRow.description,
          coverImageUrl: sorterRow.coverImageUrl,
          version: sorterRow.version || 1,
        });
      }

      // Create tags from names
      const tagNameToSlug = new Map<string, string>();
      const tags = Array.isArray(meta.tags) ? meta.tags : [];
      // Replace all tags for simplicity
      await trx.delete(sorterTags).where(eq(sorterTags.sorterId, sorterRow.id));
      for (const t of tags) {
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

      // Compute cover image URL
      const coverKey: string | null = meta.coverKey || null;
      const coverImageUrl = coverKey ? getR2PublicUrl(coverKey) : sorterRow.coverImageUrl;

      // Update sorter main record
      await trx
        .update(sorters)
        .set({
          title: meta.title || sorterRow.title,
          description: meta.description ?? sorterRow.description,
          category: meta.category ?? sorterRow.category,
          coverImageUrl,
          status: "active",
          version: newVersion,
        })
        .where(eq(sorters.id, sorterRow.id));

      // Insert new history for newVersion
      await trx.insert(sorterHistory).values({
        sorterId: sorterRow.id,
        title: meta.title || sorterRow.title,
        description: meta.description ?? sorterRow.description,
        coverImageUrl,
        version: newVersion,
      });

      // Replace items based on new list (meta.items) and expected uploaded images
      await trx.delete(sorterItems).where(eq(sorterItems.sorterId, sorterRow.id));

      const newItemsValues = (meta.items as Array<{ title: string; tagNames?: string[]; hasImage?: boolean }>)
        .map((item, index) => {
          const mainEntry = expected.find((e) => e.type === "item" && e.itemIndex === index);
          const imageUrl = mainEntry
            ? getR2PublicUrl(mainEntry.key)
            : (currentItems.find((ci) => ci.title.toLowerCase() === item.title.toLowerCase())?.imageUrl || null);
          const tagSlugs = (item.tagNames || [])
            .map((name) => tagNameToSlug.get(name))
            .filter(Boolean) as string[];

          return {
            sorterId: sorterRow.id,
            title: item.title,
            slug: (meta.itemSlugs && meta.itemSlugs[index]) || generateSorterItemSlug(item.title),
            imageUrl,
            tagSlugs,
            version: newVersion,
          };
        });

      if (newItemsValues.length > 0) {
        await trx.insert(sorterItems).values(newItemsValues);
      }
    });

    await db
      .update(uploadBatches)
      .set({ status: "active" })
      .where(eq(uploadBatches.id, uploadBatchId));

    // Revalidate relevant pages and API caches
    try {
      revalidatePath(`/sorter/${slug}`);
      revalidatePath("/");
      revalidatePath("/browse");
      // Also revalidate API response used by the page
      revalidatePath(`/api/sorters/${slug}`);

      // Revalidate user profile page if username exists
      const owner = await db
        .select({ username: user.username })
        .from(user)
        .where(eq(user.id, sorterRow.userId))
        .limit(1);
      const username = owner[0]?.username;
      if (username) {
        revalidatePath(`/user/${username}`);
      }
    } catch (e) {
      console.warn("Revalidate failed (non-fatal):", e);
    }

    return Response.json({ status: "active", missing: [] });
  } catch (error) {
    console.error("Error finalizing edit batch:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
