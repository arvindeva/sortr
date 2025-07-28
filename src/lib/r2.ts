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
  // Debug logging for environment variables
  console.log("🔍 R2 Environment Debug:");
  console.log("R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL);
  console.log(
    "R2_PUBLIC_URL (JSON):",
    JSON.stringify(process.env.R2_PUBLIC_URL),
  );
  console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);
  console.log("Key:", key);

  // Check if a custom public URL is configured
  if (process.env.R2_PUBLIC_URL) {
    const url = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log("✅ Generated R2 URL:", url);
    return url;
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
): string {
  // Extract file extension from original name
  const extension = originalName.split(".").pop() || "jpg";
  return `sessions/${sessionId}/${fileType}/${index}.${extension}`;
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
      return getVersionedItemKey(
        sorterId,
        itemSlug || "unknown",
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
