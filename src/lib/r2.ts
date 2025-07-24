import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

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
