import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/db";
import { sortingResults } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Initialize R2 client
export const r2Client = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET!;

/**
 * Upload a file to R2 storage
 * @param key - The file key/path in the bucket
 * @param file - The file buffer to upload
 * @param contentType - The MIME type of the file
 * @returns Promise<void>
 */
export async function uploadToR2(
  key: string,
  file: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
}

/**
 * Delete a file from R2 storage
 * @param key - The file key/path in the bucket
 * @returns Promise<void>
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate the public URL for an R2 object
 * @param key - The file key/path in the bucket
 * @returns The public URL
 */
export function getR2PublicUrl(key: string): string {
  // Check if a custom public URL is configured
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  // Default R2.dev subdomain format
  // For R2, the public URL is typically: https://pub-<hash>.r2.dev/<key>
  // But this requires setting up a public bucket or custom domain

  // If no public URL configured, try the R2.dev format
  const bucketName = process.env.R2_BUCKET!;

  // Extract account ID from R2_ENDPOINT if available
  const endpoint = process.env.R2_ENDPOINT;
  if (endpoint) {
    // R2_ENDPOINT format: https://<account_id>.r2.cloudflarestorage.com
    const accountId = endpoint.match(
      /https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/,
    )?.[1];
    if (accountId) {
      // This is a fallback - you'll need to configure R2 public access
      return `https://pub-${accountId}.r2.dev/${key}`;
    }
  }

  // Final fallback (will likely not work without proper R2 public configuration)
  return `https://${bucketName}.r2.dev/${key}`;
}

/**
 * Generate avatar key for a user
 * @param userId - The user ID
 * @returns The avatar file key
 */
export function getAvatarKey(userId: string): string {
  return `avatars/${userId}.jpg`;
}

/**
 * Generate cover image key for a sorter (legacy, use versioned keys for new uploads)
 * @param sorterId - The sorter ID
 * @returns The cover image file key
 */
export function getCoverKey(
  sorterId: string,
  extension: string = "jpg",
): string {
  return `sorters/${sorterId}/cover.${extension}`;
}

/**
 * Generate sorter item image key (legacy, use versioned keys for new uploads)
 * @param sorterId - The sorter ID
 * @param itemSlug - The item slug (includes group prefix if applicable)
 * @returns The sorter item image file key
 */
export function getSorterItemKey(
  sorterId: string,
  itemSlug: string,
  extension: string = "jpg",
): string {
  return `sorters/${sorterId}/${itemSlug}.${extension}`;
}

/**
 * Extract sorter item key components for cleanup
 * @param sorterId - The sorter ID
 * @returns The prefix for all sorter item keys
 */
export function getSorterItemKeyPrefix(sorterId: string): string {
  return `sorters/${sorterId}/`;
}

/**
 * Generate pre-signed URL for direct R2 upload
 * @param key - The file key/path in the bucket
 * @param contentType - The MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 15 minutes)
 * @returns Promise<string> - The pre-signed upload URL
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900, // 15 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate session-based key for temporary uploads
 * @param sessionId - The upload session ID
 * @param fileType - Type of file (cover, item, group-cover)
 * @param index - Index for multiple files of same type
 * @param originalName - Original filename for reference
 * @returns The session-based file key
 */
export function getSessionFileKey(
  sessionId: string,
  fileType: "cover" | "item" | "group-cover",
  index: number,
  originalName: string,
  suffix?: string,
): string {
  // All images are converted to JPEG during compression, so always use .jpg extension
  const extension = "jpg";
  const baseName = `${index}${suffix || ""}`;
  return `sessions/${sessionId}/${fileType}/${baseName}.${extension}`;
}

/**
 * Generate versioned sorter image keys
 */
export function getVersionedCoverKey(
  sorterId: string,
  version: number,
  extension: string = "jpg",
): string {
  return `sorters/${sorterId}/v${version}/cover.${extension}`;
}

export function getVersionedItemKey(
  sorterId: string,
  itemSlug: string,
  version: number,
  extension: string = "jpg",
): string {
  return `sorters/${sorterId}/v${version}/${itemSlug}.${extension}`;
}

export function getVersionedGroupKey(
  sorterId: string,
  groupSlug: string,
  version: number,
  extension: string = "jpg",
): string {
  return `sorters/${sorterId}/v${version}/group-${groupSlug}.${extension}`;
}

/**
 * Convert session file key to versioned sorter key
 * Updated for database versioning approach
 */
export function convertSessionKeyToSorterKey(
  sessionKey: string,
  sorterId: string,
  version: number, // NEW: Version parameter
  itemSlug?: string,
): string {
  const parts = sessionKey.split("/");
  const fileType = parts[2]; // cover, item, or group-cover
  const filename = parts[3]; // index.extension

  // Extract the original file extension
  const extension = filename.split(".").pop() || "jpg";

  switch (fileType) {
    case "cover":
      return getVersionedCoverKey(sorterId, version, extension);
    case "item":
      // Check if this is a thumbnail file (has -thumb suffix in filename)
      const baseFilename = filename.replace(/\.[^/.]+$/, ""); // Remove extension
      const isThumb = baseFilename.includes("-thumb");
      // Don't add -thumb suffix if the itemSlug already ends with -thumb
      const finalSlug = isThumb ? 
        (itemSlug?.endsWith("-thumb") ? itemSlug : `${itemSlug}-thumb`) : 
        itemSlug;

      return getVersionedItemKey(
        sorterId,
        finalSlug || "unknown",
        version,
        extension,
      );
    case "group-cover":
      return getVersionedGroupKey(
        sorterId,
        itemSlug || "group-cover",
        version,
        extension,
      );
    default:
      throw new Error(`Unknown file type: ${fileType}`);
  }
}

/**
 * Safe cleanup for specific sorter version (checks for ranking references)
 */
export async function cleanupSorterVersion(
  sorterId: string,
  version: number,
): Promise<{
  deleted: string[];
  preserved: string[];
}> {
  const deleted: string[] = [];
  const preserved: string[] = [];

  try {
    // Check if any rankings reference this version
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
        `Preserving version ${version} images due to existing rankings`,
      );
      return { deleted, preserved };
    }

    // Safe to delete this version's images
    const prefix = `sorters/${sorterId}/v${version}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await r2Client.send(listCommand);
    const keys =
      response.Contents?.map((obj) => obj.Key).filter((key): key is string =>
        Boolean(key),
      ) || [];

    for (const key of keys) {
      try {
        await deleteFromR2(key);
        deleted.push(key);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    return { deleted, preserved };
  } catch (error) {
    console.error("Error during version cleanup:", error);
    return { deleted, preserved };
  }
}

/**
 * Utility function to chunk an array into smaller batches
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Copy a single R2 object (internal utility for parallel operations)
 */
async function copyR2Object(sourceKey: string, destKey: string): Promise<void> {
  try {
    const { GetObjectCommand, PutObjectCommand } = await import(
      "@aws-sdk/client-s3"
    );

    // Get the object from the source location
    const sourceObject = await r2Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: sourceKey,
      }),
    );

    if (!sourceObject.Body) {
      throw new Error(`Source object not found: ${sourceKey}`);
    }

    // Convert the body to a buffer
    const bodyBytes = await sourceObject.Body.transformToByteArray();

    // Upload to the destination location (no processing)
    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: destKey,
        Body: bodyBytes,
        ContentType: sourceObject.ContentType, // Preserve original content type
        CacheControl: "public, max-age=31536000", // 1 year cache
      }),
    );
  } catch (error) {
    console.error(
      `Failed to copy file from ${sourceKey} to ${destKey}:`,
      error,
    );
    throw error;
  }
}

/**
 * Copy multiple R2 objects in parallel with concurrency limiting
 */
export async function copyR2ObjectsInParallel(
  operations: Array<{ sourceKey: string; destKey: string }>,
  concurrency = 10,
): Promise<
  Array<{
    success: boolean;
    sourceKey: string;
    destKey: string;
    error?: string;
  }>
> {
  if (operations.length === 0) {
    return [];
  }

  console.log(
    `Starting parallel R2 copy of ${operations.length} objects with concurrency ${concurrency}`,
  );
  const startTime = Date.now();

  const results: Array<{
    success: boolean;
    sourceKey: string;
    destKey: string;
    error?: string;
  }> = [];

  // Process operations in batches to control concurrency
  const batches = chunkArray(operations, concurrency);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(
      `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`,
    );

    // Execute all operations in this batch in parallel
    const batchPromises = batch.map(async (operation) => {
      try {
        await copyR2Object(operation.sourceKey, operation.destKey);
        return {
          success: true,
          sourceKey: operation.sourceKey,
          destKey: operation.destKey,
        };
      } catch (error) {
        console.error(
          `Failed to copy ${operation.sourceKey} -> ${operation.destKey}:`,
          error,
        );
        return {
          success: false,
          sourceKey: operation.sourceKey,
          destKey: operation.destKey,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Wait for all operations in this batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Extract results from Promise.allSettled
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // This shouldn't happen since we're catching errors in the individual promises
        console.error("Unexpected batch promise rejection:", result.reason);
        results.push({
          success: false,
          sourceKey: "unknown",
          destKey: "unknown",
          error: "Batch promise rejection",
        });
      }
    }
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  console.log(
    `Parallel R2 copy completed in ${duration}ms: ${successCount} success, ${failureCount} failures`,
  );

  return results;
}
