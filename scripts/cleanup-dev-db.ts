import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  sessionFiles,
  sorterHistory,
  sorterItems,
  sorters,
  sorterTags,
  sortingResults,
  uploadSessions,
  uploadBatches,
} from "../src/db/schema";

// Load environment variables
dotenv.config();
// Optional: force-load a specific env file for cleanup safety
if (process.env.CLEANUP_ENV_FILE) {
  try {
    dotenv.config({ path: process.env.CLEANUP_ENV_FILE, override: true });
    console.log(`🔐 Loaded cleanup env from: ${process.env.CLEANUP_ENV_FILE}`);
  } catch (e) {
    console.warn(
      `⚠️  Failed to load CLEANUP_ENV_FILE='${process.env.CLEANUP_ENV_FILE}'. Using default env.`,
    );
  }
}

console.log("🔧 Environment check:");
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
);
console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log(
  "DEV_CLEANUP_ENABLED:",
  process.env.DEV_CLEANUP_ENABLED ? "✅ Set" : "❌ Missing",
);

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;
const DEV_CLEANUP_ENABLED = process.env.DEV_CLEANUP_ENABLED;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

// Enhanced safety validation
function isValidDevDatabase(url: string): { valid: boolean; reason?: string } {
  const urlLower = url.toLowerCase();

  // Production indicators that should never be present
  const prodIndicators = ["prod", "production", "live"];
  const foundProdIndicator = prodIndicators.find((indicator) =>
    urlLower.includes(indicator),
  );
  if (foundProdIndicator) {
    return {
      valid: false,
      reason: `Contains production indicator: '${foundProdIndicator}'`,
    };
  }

  // Optionally enforce host allowlist when provided
  const allowlistEnv = process.env.CLEANUP_DB_HOST_ALLOWLIST;
  if (allowlistEnv) {
    try {
      const allow = allowlistEnv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const host = new URL(url).hostname.toLowerCase();
      if (!allow.includes(host)) {
        return {
          valid: false,
          reason: `Host '${host}' is not in CLEANUP_DB_HOST_ALLOWLIST=[${allow.join(", ")}]`,
        };
      }
    } catch (e) {
      return { valid: false, reason: "Invalid URL or host allowlist" };
    }
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

// Check 3: Enhanced database URL validation
const dbValidation = isValidDevDatabase(DATABASE_URL as string);
if (!dbValidation.valid) {
  console.error("❌ Safety check failed: Database URL validation failed");
  console.error(`Reason: ${dbValidation.reason}`);
  console.error(
    `Database URL (masked): ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}`,
  );
  process.exit(1);
}

console.log("✅ All safety checks passed!");

// Create database connection
const pool = new Pool({
  connectionString: DATABASE_URL as string,
});
const db = drizzle(pool);

async function confirmTargetDatabase(url: string): Promise<boolean> {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let host = "";
  let port = "";
  let name = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    port = u.port || "5432";
    name = (u.pathname || "/").replace(/^\//, "");
  } catch {
    // Fallback to masked display
    console.log(`Target (masked): ${url.replace(/\/\/.*@/, "//***@")}`);
  }

  const target = `${host}:${port}/${name}`;
  console.log(`\nAbout to clean database: ${target}`);
  const prompt = `Type exactly to confirm: ${target}\n> `;

  return await new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer.trim() === target);
    });
  });
}

async function countRecords(tableName: string, table: any): Promise<number> {
  try {
    const result = await db.select().from(table);
    return result.length;
  } catch (error) {
    console.error(`❌ Error counting ${tableName}:`, error);
    return 0;
  }
}

async function deleteTableRecords(
  tableName: string,
  table: any,
): Promise<number> {
  try {
    const result = await db.delete(table);
    return result.rowCount || 0;
  } catch (error) {
    console.error(`❌ Error deleting from ${tableName}:`, error);
    return 0;
  }
}

async function cleanupDevDatabase() {
  console.log("🚀 Starting dev database cleanup...");
  console.log(
    "🎯 Strategy: Remove all sorter-related data while preserving users and avatars",
  );
  console.log(
    "🛡️  Preserving: user, account, session, verificationToken tables\n",
  );

  try {
    const confirmed = await confirmTargetDatabase(DATABASE_URL as string);
    if (!confirmed) {
      console.log("❌ Cleanup cancelled (database confirmation mismatch).");
      process.exit(1);
    }

    // Tables to clean in dependency order (children first, then parents)
    const tablesToClean = [
      // Child tables first
      { name: "sessionFiles", table: sessionFiles },
      { name: "uploadBatches", table: uploadBatches },
      { name: "sortingResults", table: sortingResults },
      { name: "sorterItems", table: sorterItems },
      { name: "sorterTags", table: sorterTags },
      { name: "sorterHistory", table: sorterHistory },
      { name: "uploadSessions", table: uploadSessions },
      // Parent last
      { name: "sorters", table: sorters },
    ];

    console.log("📊 Current record counts:");
    const initialCounts: Record<string, number> = {};

    for (const { name, table } of tablesToClean) {
      const count = await countRecords(name, table);
      initialCounts[name] = count;
      console.log(`  📋 ${name}: ${count} records`);
    }

    const totalInitialRecords = Object.values(initialCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (totalInitialRecords === 0) {
      console.log("\n✅ Database is already clean!");
      return;
    }

    console.log(`\n🗑️  Total records to delete: ${totalInitialRecords}`);
    console.log("\n🗑️  Starting deletion (in dependency order)...");

    let totalDeleted = 0;
    const deletionResults: Record<string, number> = {};

    for (const { name, table } of tablesToClean) {
      if (initialCounts[name] > 0) {
        console.log(`\n🔄 Cleaning ${name}...`);
        const deleted = await deleteTableRecords(name, table);
        deletionResults[name] = deleted;
        totalDeleted += deleted;
        console.log(`   ✅ Deleted ${deleted} records from ${name}`);
      } else {
        console.log(`   ⏭️  Skipping ${name} (already empty)`);
        deletionResults[name] = 0;
      }
    }

    // Verify cleanup
    console.log("\n🔍 Verifying cleanup...");
    let remainingRecords = 0;

    for (const { name, table } of tablesToClean) {
      const count = await countRecords(name, table);
      if (count > 0) {
        console.log(`   ⚠️  ${name}: ${count} records remaining`);
        remainingRecords += count;
      } else {
        console.log(`   ✅ ${name}: clean`);
      }
    }

    // Final summary
    console.log(`\n🎉 Database cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`  🗑️  Total deleted: ${totalDeleted} records`);
    console.log(`  📊 Breakdown:`);

    for (const { name } of tablesToClean) {
      if (deletionResults[name] > 0) {
        console.log(`    - ${name}: ${deletionResults[name]} records`);
      }
    }

    if (remainingRecords > 0) {
      console.log(`  ⚠️  Records remaining: ${remainingRecords}`);
      console.log(
        `\n⚠️  Some records couldn't be deleted. This might be due to foreign key constraints.`,
      );
    } else {
      console.log(`  🎯 All sorter data successfully removed!`);
    }

    console.log(
      `\n🛡️  Preserved tables: user, account, session, verificationToken`,
    );
  } catch (error) {
    console.error("💥 Database cleanup failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the cleanup
cleanupDevDatabase().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
