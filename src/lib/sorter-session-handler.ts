import { NextResponse } from "next/server";
import { db } from "@/db";
import { sorters, sorterItems, sorterTags, sorterHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSorterSchema } from "@/lib/validations";
import {
  copyR2ObjectsInParallel,
  convertSessionKeyToSorterKey,
  getR2PublicUrl,
} from "@/lib/r2";
import {
  generateSorterItemSlug,
  generateUniqueTagSlug,
  extractIdFromFileName,
  removeIdFromFileName,
} from "@/lib/utils";
import { getUploadSession, completeUploadSession } from "@/lib/session-manager";
import type { UploadedFile } from "@/types/upload";
import { z } from "zod";

interface SessionHandlerOptions {
  mode: "create" | "edit";
  currentSorter?: {
    id: string;
    version: number;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
  };
  existingSlugs?: string[];
  generateSlug?: (title: string) => string;
  makeSlugUnique?: (slug: string, existingSlugs: string[]) => string;
}

interface SessionHandlerResult {
  sorterId: string;
  version: number;
  title: string;
  coverImageUrl: string | null;
}

/**
 * Unified handler for session-to-permanent file migration and database operations
 * Used by both create and edit sorter APIs
 */
export async function handleSorterWithUploadSession(
  body: any,
  userId: string,
  options: SessionHandlerOptions,
): Promise<NextResponse<any>> {
  const { uploadSession: sessionId, uploadedFiles, ...sorterData } = body;

  try {
    // Phase 1: Validate upload session
    const session = await getUploadSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 400 },
      );
    }

    if (session.userId !== userId) {
      return NextResponse.json(
        { error: "Upload session does not belong to current user" },
        { status: 403 },
      );
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "No files found in upload session" },
        { status: 400 },
      );
    }

    // Phase 2: Validate sorter data
    const validatedData = createSorterSchema.parse(sorterData);

    // Phase 3: Determine version and sorter ID
    let sorterId: string;
    let version: number;
    let finalSlug: string;

    if (options.mode === "create") {
      // For create, we'll get the ID after database insertion
      sorterId = `temp-${Date.now()}`;
      version = 1;
      finalSlug =
        options.makeSlugUnique?.(
          options.generateSlug?.(validatedData.title) || validatedData.title,
          options.existingSlugs || [],
        ) || validatedData.title;
    } else {
      // For edit, use existing sorter
      sorterId = options.currentSorter!.id;
      version = options.currentSorter!.version + 1;
      finalSlug = ""; // Not needed for edit
    }

    // Phase 4: Copy session files to permanent versioned paths in parallel
    const copyOperations: Array<{
      sourceKey: string;
      destKey: string;
      originalKey: string;
      isMainFile: boolean;
    }> = [];

    let coverImageUrl: string | null = null;
    const itemImageUrls = new Map<string, string>(); // itemTitle -> imageUrl

    // Process cover file
    const coverFile = uploadedFiles.find(
      (f: UploadedFile) => f.type === "cover",
    );
    if (coverFile) {
      console.log(`Processing cover file: ${coverFile.originalName}`);
      const newKey = convertSessionKeyToSorterKey(
        coverFile.key,
        sorterId,
        version,
        "cover",
      );
      copyOperations.push({
        sourceKey: coverFile.key,
        destKey: newKey,
        originalKey: coverFile.key,
        isMainFile: true,
      });
      coverImageUrl = getR2PublicUrl(newKey);
    }

    // Process item files (using create sorter logic)
    const itemFiles = uploadedFiles.filter(
      (f: UploadedFile) => f.type === "item",
    );
    const filesByUniqueId = new Map<string, UploadedFile[]>();

    itemFiles.forEach((file: UploadedFile) => {
      const uniqueId = extractIdFromFileName(file.originalName);
      if (uniqueId) {
        if (!filesByUniqueId.has(uniqueId)) {
          filesByUniqueId.set(uniqueId, []);
        }
        filesByUniqueId.get(uniqueId)!.push(file);
      } else {
        console.warn(
          `File "${file.originalName}" does not have a unique ID suffix`,
        );
      }
    });

    if (validatedData.items) {
      const usedUniqueIds = new Set<string>(); // Track which file groups have been used

      console.log(
        `🔍 Processing ${validatedData.items.length} items for file matching`,
      );
      console.log(
        `📁 Available file groups: ${Array.from(filesByUniqueId.keys())}`,
      );

      for (
        let itemIndex = 0;
        itemIndex < validatedData.items.length;
        itemIndex++
      ) {
        const item = validatedData.items[itemIndex];
        const itemSlug = generateSorterItemSlug(item.title);

        console.log(`🎯 Processing item ${itemIndex}: "${item.title}"`);

        // Find matching files for this item that haven't been used yet
        let matchingFiles: UploadedFile[] = [];
        let matchedUniqueId: string | null = null;

        for (const [uniqueId, files] of filesByUniqueId.entries()) {
          // Skip files that have already been used
          if (usedUniqueIds.has(uniqueId)) {
            console.log(`⏭️  Skipping already used uniqueId: ${uniqueId}`);
            continue;
          }

          const sampleFile = files[0];
          const originalNameWithoutSuffix = removeIdFromFileName(
            sampleFile.originalName,
          );
          const nameWithoutExt = originalNameWithoutSuffix.replace(
            /\.[^/.]+$/,
            "",
          );

          console.log(
            `🔎 Checking uniqueId ${uniqueId}: "${nameWithoutExt}" vs "${item.title}"`,
          );

          if (nameWithoutExt.toLowerCase() === item.title.toLowerCase()) {
            matchingFiles = files;
            matchedUniqueId = uniqueId;
            console.log(
              `✅ Found match! uniqueId: ${uniqueId}, files: ${files.length}`,
            );
            break; // Take the first available match for this item name
          }
        }

        if (matchingFiles.length > 0 && matchedUniqueId) {
          // Mark this unique ID as used
          usedUniqueIds.add(matchedUniqueId);
          console.log(`🔒 Marked uniqueId ${matchedUniqueId} as used`);

          for (const file of matchingFiles) {
            const newKey = convertSessionKeyToSorterKey(
              file.key,
              sorterId,
              version,
              itemSlug,
            );
            const isMainFile = !file.key.includes("-thumb");

            copyOperations.push({
              sourceKey: file.key,
              destKey: newKey,
              originalKey: file.key,
              isMainFile,
            });

            if (isMainFile) {
              const itemImageUrl = getR2PublicUrl(newKey);
              // Use a unique key for duplicate names: combine title with item index
              const uniqueItemKey = `${item.title}_${itemIndex}`;
              itemImageUrls.set(uniqueItemKey, itemImageUrl);
              console.log(
                `💾 Stored image URL for key "${uniqueItemKey}": ${itemImageUrl}`,
              );
            }
          }
        } else {
          console.log(
            `❌ No matching files found for item ${itemIndex}: "${item.title}"`,
          );
        }
      }

      console.log(
        `📊 Final itemImageUrls map:`,
        Array.from(itemImageUrls.entries()),
      );
    }

    // Phase 5: Execute R2 copy operations in parallel
    console.log(
      `Executing ${copyOperations.length} R2 copy operations for ${options.mode}`,
    );
    const copyResults = await copyR2ObjectsInParallel(
      copyOperations.map((op) => ({
        sourceKey: op.sourceKey,
        destKey: op.destKey,
      })),
      10,
    );

    const failedOperations = copyResults.filter((result) => !result.success);
    if (failedOperations.length > 0) {
      console.error(
        `${failedOperations.length} R2 copy operations failed:`,
        failedOperations,
      );
      throw new Error(`Failed to copy ${failedOperations.length} files to R2`);
    }

    // Phase 6: Database transaction with pre-computed URLs
    const result = await db.transaction(async (trx) => {
      let finalSorterId: string;
      let finalVersion: number;

      if (options.mode === "create") {
        // Create new sorter
        const [newSorter] = await trx
          .insert(sorters)
          .values({
            title: validatedData.title,
            slug: finalSlug,
            description: validatedData.description || null,
            category: validatedData.category || null,
            userId: userId,
            coverImageUrl,
            version: 1,
          })
          .returning();

        finalSorterId = newSorter.id;
        finalVersion = 1;

        // Add to sorterHistory as version 1
        await trx.insert(sorterHistory).values({
          sorterId: finalSorterId,
          title: validatedData.title,
          description: validatedData.description,
          coverImageUrl,
          version: finalVersion,
        });
      } else {
        // Edit existing sorter
        const currentSorter = options.currentSorter!;
        finalSorterId = currentSorter.id;
        finalVersion = version;

        // Archive current version to sorterHistory (if not already archived)
        const existingHistory = await trx
          .select({ id: sorterHistory.id })
          .from(sorterHistory)
          .where(
            and(
              eq(sorterHistory.sorterId, currentSorter.id),
              eq(sorterHistory.version, currentSorter.version),
            ),
          )
          .limit(1);

        if (existingHistory.length === 0) {
          await trx.insert(sorterHistory).values({
            sorterId: currentSorter.id,
            version: currentSorter.version,
            title: currentSorter.title,
            description: currentSorter.description,
            coverImageUrl: currentSorter.coverImageUrl,
          });
        }

        // Update main sorter record
        await trx
          .update(sorters)
          .set({
            version: finalVersion,
            title: validatedData.title,
            description: validatedData.description,
            category: validatedData.category,
            coverImageUrl: coverImageUrl || validatedData.coverImageUrl || null,
          })
          .where(eq(sorters.id, currentSorter.id));

        // Add new version to sorterHistory
        await trx.insert(sorterHistory).values({
          sorterId: finalSorterId,
          title: validatedData.title,
          description: validatedData.description,
          coverImageUrl: coverImageUrl || validatedData.coverImageUrl || null,
          version: finalVersion,
        });
      }

      // Create/update tags (same logic for both create and edit)
      if (options.mode === "edit") {
        await trx
          .delete(sorterTags)
          .where(eq(sorterTags.sorterId, finalSorterId));
      }

      const createdTagSlugs = new Map<string, string>();
      if (validatedData.tags && validatedData.tags.length > 0) {
        for (const tag of validatedData.tags) {
          const existingTagSlugs = Array.from(createdTagSlugs.values());
          const tagSlug = generateUniqueTagSlug(tag.name, existingTagSlugs);

          await trx.insert(sorterTags).values({
            sorterId: finalSorterId,
            name: tag.name,
            slug: tagSlug,
            sortOrder: tag.sortOrder,
          });

          createdTagSlugs.set(tag.name, tagSlug);
        }
      }

      // Create/update items (same logic for both create and edit)
      if (options.mode === "edit") {
        await trx
          .delete(sorterItems)
          .where(eq(sorterItems.sorterId, finalSorterId));
      }

      for (
        let itemIndex = 0;
        itemIndex < validatedData.items.length;
        itemIndex++
      ) {
        const item = validatedData.items[itemIndex];
        const itemSlug = generateSorterItemSlug(item.title);

        // Use unique key for duplicate names: combine title with item index
        const uniqueItemKey = `${item.title}_${itemIndex}`;
        const itemImageUrl =
          itemImageUrls.get(uniqueItemKey) || item.imageUrl || null;

        console.log(
          `🗄️  DB Insert - Item ${itemIndex}: "${item.title}", key: "${uniqueItemKey}", imageUrl: ${itemImageUrl ? "✅ FOUND" : "❌ NULL"}`,
        );
        if (itemImageUrl) {
          console.log(`🔗 URL: ${itemImageUrl}`);
        }

        // Convert tag names to tag slugs
        const itemTagSlugs: string[] = [];
        if (item.tagSlugs && item.tagSlugs.length > 0) {
          for (const tagName of item.tagSlugs) {
            const tagSlug = createdTagSlugs.get(tagName);
            if (tagSlug) {
              itemTagSlugs.push(tagSlug);
            }
          }
        }

        await trx.insert(sorterItems).values({
          sorterId: finalSorterId,
          title: item.title,
          slug: itemSlug,
          imageUrl: itemImageUrl,
          tagSlugs: itemTagSlugs,
          version: finalVersion,
        });
      }

      return {
        sorterId: finalSorterId,
        version: finalVersion,
        title: validatedData.title,
        coverImageUrl: coverImageUrl || validatedData.coverImageUrl || null,
      };
    });

    // Phase 7: Update R2 keys with real sorter ID (for create mode)
    if (options.mode === "create" && sorterId.startsWith("temp-")) {
      // We need to rename the R2 objects to use the real sorter ID
      const tempSorterId = sorterId;
      const renameOperations = copyOperations.map((op) => ({
        sourceKey: op.destKey,
        destKey: op.destKey.replace(tempSorterId, result.sorterId),
      }));

      if (renameOperations.length > 0) {
        console.log(
          `Renaming ${renameOperations.length} R2 objects with real sorter ID`,
        );
        await copyR2ObjectsInParallel(renameOperations, 10);

        // TODO: Delete the temporary files after successful rename
        // Note: We could implement cleanup here if needed
      }
    }

    // Phase 8: Mark upload session as complete
    await completeUploadSession(sessionId);

    const message =
      options.mode === "create"
        ? "Sorter created successfully with uploaded files"
        : "Sorter updated successfully with uploaded files";

    return NextResponse.json({
      id: result.sorterId,
      slug: finalSlug || undefined,
      title: result.title,
      version: result.version,
      coverImageUrl: result.coverImageUrl,
      message,
    });
  } catch (error) {
    console.error(
      `Error ${options.mode}ing sorter with upload session:`,
      error,
    );

    if (error instanceof z.ZodError) {
      console.error("Validation error details:", error.errors);
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: `Failed to ${options.mode} sorter` },
      { status: 500 },
    );
  }
}
