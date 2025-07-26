import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize R2 client
const r2Client = new S3Client({
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
    const url = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log("Generated R2 URL:", url);
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
 * Generate cover image key for a sorter
 * @param sorterId - The sorter ID
 * @returns The cover image file key
 */
export function getCoverKey(sorterId: string): string {
  return `covers/${sorterId}.jpg`;
}

/**
 * Generate sorter item image key
 * @param sorterId - The sorter ID
 * @param itemSlug - The item slug (includes group prefix if applicable)
 * @returns The sorter item image file key
 */
export function getSorterItemKey(sorterId: string, itemSlug: string): string {
  return `sorters/${sorterId}/${itemSlug}.jpg`;
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
  expiresIn: number = 900 // 15 minutes
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
  fileType: 'cover' | 'item' | 'group-cover',
  index: number,
  originalName: string
): string {
  // Extract file extension from original name
  const extension = originalName.split('.').pop() || 'jpg';
  return `sessions/${sessionId}/${fileType}/${index}.${extension}`;
}

/**
 * Convert session file key to final sorter key
 * @param sessionKey - The session-based key
 * @param sorterId - The final sorter ID
 * @param itemSlug - The item slug (for item files)
 * @returns The final sorter file key
 */
export function convertSessionKeyToSorterKey(
  sessionKey: string,
  sorterId: string,
  itemSlug?: string
): string {
  const parts = sessionKey.split('/');
  const fileType = parts[2]; // cover, item, or group-cover
  const filename = parts[3]; // index.extension
  
  switch (fileType) {
    case 'cover':
      return getCoverKey(sorterId);
    case 'item':
      return getSorterItemKey(sorterId, itemSlug || 'unknown');
    case 'group-cover':
      return getSorterItemKey(sorterId, itemSlug || 'group-cover');
    default:
      throw new Error(`Unknown file type: ${fileType}`);
  }
}
