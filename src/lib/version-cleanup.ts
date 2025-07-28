import { db } from "@/db";
import {
  sorterHistory,
  sorterItems,
  sorterGroups,
  sortingResults,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cleanupSorterVersion } from "@/lib/r2";

/**
 * Clean up a specific version if no rankings reference it
 */
export async function cleanupVersion(
  sorterId: string,
  version: number,
): Promise<void> {
  try {
    // Double-check that no rankings reference this version
    const rankingsUsingVersion = await db
      .select({ id: sortingResults.id })
      .from(sortingResults)
      .where(
        and(
          eq(sortingResults.sorterId, sorterId),
          eq(sortingResults.version, version),
        ),
      )
      .limit(1);

    if (rankingsUsingVersion.length > 0) {
      console.log(
        `Version ${version} gained references during cleanup, skipping`,
      );
      return;
    }

    // Safe to delete - no rankings reference this version
    console.log(
      `Cleaning up unreferenced version ${version} for sorter ${sorterId}`,
    );

    // Delete from database tables
    await db
      .delete(sorterHistory)
      .where(
        and(
          eq(sorterHistory.sorterId, sorterId),
          eq(sorterHistory.version, version),
        ),
      );

    await db
      .delete(sorterItems)
      .where(
        and(
          eq(sorterItems.sorterId, sorterId),
          eq(sorterItems.version, version),
        ),
      );

    await db
      .delete(sorterGroups)
      .where(
        and(
          eq(sorterGroups.sorterId, sorterId),
          eq(sorterGroups.version, version),
        ),
      );

    // Clean up R2 images for this version
    const r2Cleanup = await cleanupSorterVersion(sorterId, version);
    console.log(
      `R2 cleanup for v${version}: ${r2Cleanup.deleted.length} deleted, ${r2Cleanup.preserved.length} preserved`,
    );
  } catch (error) {
    console.error(
      `Error cleaning up version ${version} for sorter ${sorterId}:`,
      error,
    );
    // Don't throw - cleanup failures shouldn't break the main operation
  }
}

/**
 * Background job to clean up any orphaned versions
 * Can be run periodically to catch any missed cleanups
 */
export async function cleanupOrphanedVersions(): Promise<{
  versionsChecked: number;
  versionsDeleted: number;
}> {
  let versionsChecked = 0;
  let versionsDeleted = 0;

  try {
    // Find all versions in history
    const allVersions = await db
      .select({
        sorterId: sorterHistory.sorterId,
        version: sorterHistory.version,
      })
      .from(sorterHistory);

    for (const versionRecord of allVersions) {
      versionsChecked++;

      // Check if any rankings reference this version
      const rankingsUsingVersion = await db
        .select({ id: sortingResults.id })
        .from(sortingResults)
        .where(
          and(
            eq(sortingResults.sorterId, versionRecord.sorterId),
            eq(sortingResults.version, versionRecord.version),
          ),
        )
        .limit(1);

      if (rankingsUsingVersion.length === 0) {
        await cleanupVersion(versionRecord.sorterId, versionRecord.version);
        versionsDeleted++;
      }
    }

    console.log(
      `Background cleanup completed: ${versionsDeleted}/${versionsChecked} versions cleaned up`,
    );
    return { versionsChecked, versionsDeleted };
  } catch (error) {
    console.error("Error during background version cleanup:", error);
    return { versionsChecked, versionsDeleted };
  }
}
