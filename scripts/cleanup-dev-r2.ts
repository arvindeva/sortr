import dotenv from "dotenv";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Load environment variables
dotenv.config();

console.log("🔧 Environment check:");
console.log("R2_BUCKET:", process.env.R2_BUCKET);
console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT);
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing");
console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing");

const BUCKET_NAME = process.env.R2_BUCKET || "sortr-dev";

// Safety check: Only allow dev buckets
if (!BUCKET_NAME.includes('dev')) {
  console.error("❌ Safety check failed: This script only works on dev buckets");
  console.error(`Current bucket: ${BUCKET_NAME}`);
  process.exit(1);
}

// Create R2 client
const r2Client = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function listAllObjects(): Promise<string[]> {
  console.log("📋 Listing all objects in bucket...");
  
  const allKeys: string[] = [];
  let continuationToken: string | undefined = undefined;
  
  do {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });
      
      const response = await r2Client.send(listCommand);
      const objects = response.Contents || [];
      
      objects.forEach(obj => {
        if (obj.Key) {
          allKeys.push(obj.Key);
        }
      });
      
      continuationToken = response.NextContinuationToken;
      
    } catch (error) {
      console.error("❌ Error listing objects:", error);
      throw error;
    }
  } while (continuationToken);
  
  return allKeys;
}

async function deleteObjectsBatch(keys: string[]): Promise<{ deleted: number; errors: number }> {
  if (keys.length === 0) return { deleted: 0, errors: 0 };
  
  try {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    });
    
    const deleteResponse = await r2Client.send(deleteCommand);
    const deleted = deleteResponse.Deleted || [];
    const errors = deleteResponse.Errors || [];
    
    if (errors.length > 0) {
      console.error(`❌ Failed to delete ${errors.length} objects:`);
      errors.forEach(error => {
        console.error(`  - ${error.Key}: ${error.Code} - ${error.Message}`);
      });
    }
    
    return { deleted: deleted.length, errors: errors.length };
  } catch (error) {
    console.error("❌ Error deleting batch:", error);
    return { deleted: 0, errors: keys.length };
  }
}

async function cleanupDevR2() {
  console.log("🚀 Starting R2 dev bucket cleanup...");
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log("🎯 Strategy: Remove everything EXCEPT avatars/");
  console.log("⚠️  Preserving: avatars/ directory\n");
  
  try {
    // Get all objects
    const allKeys = await listAllObjects();
    console.log(`📊 Total objects found: ${allKeys.length}`);
    
    if (allKeys.length === 0) {
      console.log("✅ Bucket is already empty!");
      return;
    }
    
    // Categorize objects
    const avatarKeys = allKeys.filter(key => key.startsWith('avatars/'));
    const otherKeys = allKeys.filter(key => !key.startsWith('avatars/'));
    
    console.log(`\n📋 Object breakdown:`);
    console.log(`  👤 Avatars: ${avatarKeys.length} (will be preserved)`);
    console.log(`  🗑️  Others: ${otherKeys.length} (will be deleted)`);
    
    if (avatarKeys.length > 0) {
      console.log(`\n🛡️  Preserving avatars:`);
      avatarKeys.forEach(key => console.log(`    - ${key}`));
    }
    
    if (otherKeys.length === 0) {
      console.log("\n✅ No non-avatar objects to delete!");
      return;
    }
    
    console.log(`\n🗑️  Will delete:`);
    
    // Group by directory for better logging
    const directories = new Map<string, string[]>();
    otherKeys.forEach(key => {
      const dir = key.split('/')[0] + '/';
      if (!directories.has(dir)) {
        directories.set(dir, []);
      }
      directories.get(dir)!.push(key);
    });
    
    directories.forEach((keys, dir) => {
      console.log(`    📁 ${dir}: ${keys.length} objects`);
    });
    
    // Delete in batches of 1000 (S3 limit)
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    let totalErrors = 0;
    
    console.log(`\n🗑️  Starting deletion...`);
    
    for (let i = 0; i < otherKeys.length; i += BATCH_SIZE) {
      const batch = otherKeys.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(otherKeys.length / BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} objects)...`);
      
      const result = await deleteObjectsBatch(batch);
      totalDeleted += result.deleted;
      totalErrors += result.errors;
      
      console.log(`   ✅ Deleted ${result.deleted}/${batch.length} objects`);
      if (result.errors > 0) {
        console.log(`   ⚠️  ${result.errors} errors in this batch`);
      }
    }
    
    // Final summary
    console.log(`\n🎉 Cleanup completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`  🗑️  Total deleted: ${totalDeleted} objects`);
    console.log(`  👤 Avatars preserved: ${avatarKeys.length} objects`);
    console.log(`  ❌ Errors: ${totalErrors}`);
    console.log(`  📦 Bucket: ${BUCKET_NAME}`);
    
    if (totalErrors > 0) {
      console.log(`\n⚠️  Some objects failed to delete. Check logs above for details.`);
    }
    
  } catch (error) {
    console.error("💥 R2 cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDevR2().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});