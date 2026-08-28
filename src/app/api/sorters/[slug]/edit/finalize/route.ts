import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterTags, sorterHistory, uploadBatches, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { r2Client, getR2PublicUrl } from "@/lib/r2";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { generateSorterItemSlug } from "@/lib/utils";
import { resolveEditedItemImageUrl } from "@/lib/edit-item-image";
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

    // Already applied — a retried finalize (timeout, network blip, double
    // click) must not run the item replacement again: the first run
    // regenerated every item ID, so a second pass would match nothing.
    if (batch.status === "active") {
      return Response.json({ status: "active", missing: [] });
    }

    const meta: any = batch.metadata;

    // Stale-editor guard: the form sends the sorter version it was loaded
    // with (init stores it in the batch). If the sorter moved on since —
    // another tab, back-button restore of an old form, a save that committed
    // after its response was lost — the form's item IDs are dead and applying
    // this batch would strip images. Fail loud instead of losing data.
    // Batches from clients predating this field skip the check.
    if (
      typeof meta.baseVersion === "number" &&
      (sorterRow.version || 1) !== meta.baseVersion
    ) {
      return Response.json(
        {
          error:
            "This sorter changed since you opened the editor (another tab or an earlier save). Reload the page to keep editing — nothing was lost.",
        },
        { status: 412 },
      );
    }
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

    const STALE_EDITOR = "STALE_EDITOR";
    try {
    await db.transaction(async (trx) => {
      // Re-check the version under the transaction: two finalizes racing
      // (double click, retried request) both pass the checks above, but the
      // second one lands here after the first committed its version bump.
      if (typeof meta.baseVersion === "number") {
        const [fresh] = await trx
          .select({ version: sorters.version })
          .from(sorters)
          .where(eq(sorters.id, sorterRow.id));
        if ((fresh?.version || 1) !== meta.baseVersion) {
          throw new Error(STALE_EDITOR);
        }
      }

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
        // The edit form's item payload carries tag SLUGS (derived client-side
        // with this same lowercase/hyphen scheme), not names — the field is
        // just misleadingly called tagNames. Key the map by slug too, or every
        // capitalized/multi-word tag assignment misses the name-keyed lookup
        // and vanishes in the .filter(Boolean) below (the "filters don't save"
        // bug: 23 tags, 94 items, zero assignments surviving).
        tagNameToSlug.set(tag.slug, tag.slug);
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
          visibility: meta.visibility ?? sorterRow.visibility,
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

      const newItemsValues = (meta.items as Array<{ title: string; tagNames?: string[]; hasImage?: boolean; itemId?: string }>)
        .map((item, index) => {
          const mainEntry = expected.find((e) => e.type === "item" && e.itemIndex === index);

          const imageUrl = mainEntry
            ? getR2PublicUrl(mainEntry.key)
            : resolveEditedItemImageUrl(item, currentItems);

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
    } catch (e: any) {
      if (e?.message === STALE_EDITOR) {
        return Response.json(
          {
            error:
              "This sorter changed since you opened the editor (another tab or an earlier save). Reload the page to keep editing — nothing was lost.",
          },
          { status: 412 },
        );
      }
      throw e;
    }

    await db
      .update(uploadBatches)
      .set({ status: "active" })
      .where(eq(uploadBatches.id, uploadBatchId));

    revalidatePath(`/sorter/${sorterRow.slug}`);

    return Response.json({ status: "active", missing: [] });
  } catch (error) {
    console.error("Error finalizing edit batch:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
