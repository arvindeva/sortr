import dotenv from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

// Load environment variables
dotenv.config();

console.log("🔧 Environment check:");
console.log("R2_BUCKET:", process.env.R2_BUCKET ? "✅ Set" : "❌ Missing");
console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT ? "✅ Set" : "❌ Missing");
console.log(
  "R2_ACCESS_KEY_ID:",
  process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing",
);
console.log(
  "R2_SECRET_ACCESS_KEY:",
  process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing",
);
console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log(
  "DEV_CLEANUP_ENABLED:",
  process.env.DEV_CLEANUP_ENABLED ? "✅ Set" : "❌ Missing",
);

const BUCKET_NAME = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const NODE_ENV = process.env.NODE_ENV;
const DEV_CLEANUP_ENABLED = process.env.DEV_CLEANUP_ENABLED;

// Extract account ID from R2_ENDPOINT
let ACCOUNT_ID: string | undefined;
if (R2_ENDPOINT) {
  const match = R2_ENDPOINT.match(
    /https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/,
  );
  ACCOUNT_ID = match ? match[1] : undefined;
}

if (!BUCKET_NAME) {
  console.error("❌ Missing required R2 environment variable: R2_BUCKET");
  process.exit(1);
}

if (!R2_ENDPOINT) {
  console.error("❌ Missing required R2 environment variable: R2_ENDPOINT");
  process.exit(1);
}

if (!ACCOUNT_ID) {
  console.error("❌ Could not extract account ID from R2_ENDPOINT");
  console.error(`R2_ENDPOINT: ${R2_ENDPOINT}`);
  process.exit(1);
}

console.log(`R2_ACCOUNT_ID (extracted): ${ACCOUNT_ID}`);

// Enhanced safety validation for R2 buckets
function isValidDevBucket(bucketName: string): {
  valid: boolean;
  reason?: string;
} {
  const nameLower = bucketName.toLowerCase();

  // Production indicators that should never be present
  const prodIndicators = ["prod", "production", "live"];
  const foundProdIndicator = prodIndicators.find((indicator) =>
    nameLower.includes(indicator),
  );
  if (foundProdIndicator) {
    return {
      valid: false,
      reason: `Contains production indicator: '${foundProdIndicator}'`,
    };
  }

  // Valid development bucket patterns
  const validPatterns = [
    nameLower.endsWith("-dev"),
    nameLower.startsWith("dev-"),
    nameLower.includes(".dev"),
    nameLower.includes("development"),
    nameLower.includes("staging"),
    nameLower.includes("test"),
    nameLower === "dev", // Allow simple 'dev' bucket name
  ];

  if (!validPatterns.some((pattern) => pattern)) {
    return {
      valid: false,
      reason:
        "Must end with '-dev', start with 'dev-', contain '.dev', 'development', 'staging', 'test', or be named 'dev'",
    };
  }

  return { valid: true };
}

// Multi-layer safety checks
console.log("\n🔒 Running enhanced safety checks...");

// Check 1: NODE_ENV validation
if (NODE_ENV && !["development", "dev", "local", "test"].includes(NODE_ENV)) {
  console.error(
    "❌ Safety check failed: NODE_ENV is not set to a development environment",
  );
  console.error(`Current NODE_ENV: ${NODE_ENV}`);
  console.error("Allowed values: development, dev, local, test");
  process.exit(1);
}

// Check 2: Explicit cleanup enablement
if (DEV_CLEANUP_ENABLED !== "true") {
  console.error(
    "❌ Safety check failed: DEV_CLEANUP_ENABLED must be set to 'true'",
  );
  console.error(
    "This prevents accidental cleanup in non-development environments",
  );
  console.error("Set DEV_CLEANUP_ENABLED=true in your environment variables");
  process.exit(1);
}

// Check 3: Enhanced bucket name validation
const bucketValidation = isValidDevBucket(BUCKET_NAME);
if (!bucketValidation.valid) {
  console.error("❌ Safety check failed: R2 bucket name validation failed");
  console.error(`Reason: ${bucketValidation.reason}`);
  console.error(`Current bucket: ${BUCKET_NAME}`);
  process.exit(1);
}

console.log("✅ All safety checks passed!");

// Create R2 client
const r2Client = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function listObjectsWithPrefix(prefix: string): Promise<string[]> {
  const allKeys: string[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    try {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const response: ListObjectsV2CommandOutput =
        await r2Client.send(listCommand);
      const objects = response.Contents || [];

      objects.forEach((obj: any) => {
        if (obj.Key) {
          allKeys.push(obj.Key);
        }
      });

      continuationToken = response.NextContinuationToken;
    } catch (error) {
      console.error(`❌ Error listing objects with prefix ${prefix}:`, error);
      throw error;
    }
  } while (continuationToken);

  return allKeys;
}

async function deleteObjectsBatch(
  keys: string[],
): Promise<{ deleted: number; errors: number }> {
  if (keys.length === 0) return { deleted: 0, errors: 0 };

  try {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    });

    const deleteResponse = await r2Client.send(deleteCommand);
    const deleted = deleteResponse.Deleted || [];
    const errors = deleteResponse.Errors || [];

    if (errors.length > 0) {
      console.error(`❌ Failed to delete ${errors.length} objects:`);
      errors.forEach((error) => {
        console.error(`  - ${error.Key}: ${error.Code} - ${error.Message}`);
      });
    }

    return { deleted: deleted.length, errors: errors.length };
  } catch (error) {
    console.error("❌ Error deleting batch:", error);
    return { deleted: 0, errors: keys.length };
  }
}

async function cleanupSorterFolders() {
  console.log("🚀 Starting R2 sorter folders cleanup...");
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log("🎯 Strategy: Remove sessions/ and sorters/ folders only");
  console.log("🛡️  Preserving: avatars/ and any other folders\n");

  // Folders to clean
  const foldersToClean = ["sessions/", "sorters/"];

  try {
    let totalFound = 0;
    let totalDeleted = 0;
    let totalErrors = 0;

    for (const folder of foldersToClean) {
      console.log(`\n📁 Processing folder: ${folder}`);

      // Get all objects in this folder
      const keys = await listObjectsWithPrefix(folder);
      console.log(`📊 Objects found in ${folder}: ${keys.length}`);
      totalFound += keys.length;

      if (keys.length === 0) {
        console.log(`✅ Folder ${folder} is already empty!`);
        continue;
      }

      // Show what we're about to delete
      console.log(`🗑️  Will delete ${keys.length} objects from ${folder}:`);
      keys.slice(0, 5).forEach((key) => console.log(`    - ${key}`));
      if (keys.length > 5) {
        console.log(`    ... and ${keys.length - 5} more`);
      }

      // Delete in batches of 1000 (S3 limit)
      const BATCH_SIZE = 1000;

      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(keys.length / BATCH_SIZE);

        console.log(
          `🔄 Processing ${folder} batch ${batchNum}/${totalBatches} (${batch.length} objects)...`,
        );

        const result = await deleteObjectsBatch(batch);
        totalDeleted += result.deleted;
        totalErrors += result.errors;

        console.log(`   ✅ Deleted ${result.deleted}/${batch.length} objects`);
        if (result.errors > 0) {
          console.log(`   ⚠️  ${result.errors} errors in this batch`);
        }
      }

      console.log(`✅ Completed cleanup of ${folder}`);
    }

    // Final summary
    console.log(`\n🎉 Sorter folders cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`  📁 Folders processed: ${foldersToClean.join(", ")}`);
    console.log(`  📋 Total objects found: ${totalFound}`);
    console.log(`  🗑️  Total deleted: ${totalDeleted} objects`);
    console.log(`  🛡️  Avatars preserved: untouched`);
    console.log(`  ❌ Errors: ${totalErrors}`);
    console.log(`  📦 Bucket: ${BUCKET_NAME}`);

    if (totalErrors > 0) {
      console.log(
        `\n⚠️  Some objects failed to delete. Check logs above for details.`,
      );
    }
  } catch (error) {
    console.error("💥 R2 sorter folders cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupSorterFolders().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
