import { spawn } from "child_process";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("🚀 Starting complete dev environment cleanup...");
console.log("🎯 This will clean both database and R2 storage");
console.log("🛡️  Preserving: users, avatars, and authentication data\n");

console.log("🔧 Environment check:");
console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log(
  "DEV_CLEANUP_ENABLED:",
  process.env.DEV_CLEANUP_ENABLED ? "✅ Set" : "❌ Missing",
);

// Pre-flight safety checks
const NODE_ENV = process.env.NODE_ENV;
const DEV_CLEANUP_ENABLED = process.env.DEV_CLEANUP_ENABLED;

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

console.log("✅ Pre-flight safety checks passed!\n");

async function runScript(
  scriptPath: string,
  scriptName: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n📱 Running ${scriptName}...`);
    console.log(`📄 Script: ${scriptPath}`);
    console.log("─".repeat(80));

    const child = spawn("npx", ["tsx", scriptPath], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      console.log("─".repeat(80));
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully`);
        resolve(true);
      } else {
        console.log(`❌ ${scriptName} failed with exit code ${code}`);
        resolve(false);
      }
    });

    child.on("error", (error) => {
      console.error(`💥 Failed to start ${scriptName}:`, error);
      resolve(false);
    });
  });
}

async function cleanupAll() {
  try {
    const scriptsDir = path.join(__dirname);

    // Scripts to run in order
    const scripts = [
      {
        path: path.join(scriptsDir, "cleanup-dev-db.ts"),
        name: "Database Cleanup",
      },
      {
        path: path.join(scriptsDir, "cleanup-dev-r2-sorters.ts"),
        name: "R2 Storage Cleanup",
      },
    ];

    let allSuccessful = true;

    console.log(`🔄 Will run ${scripts.length} cleanup scripts:\n`);
    scripts.forEach((script, index) => {
      console.log(`${index + 1}. ${script.name}`);
      console.log(`   📄 ${script.path}`);
    });

    console.log(`\n⏱️  Starting cleanup sequence...`);

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      console.log(`\n🔄 Step ${i + 1}/${scripts.length}: ${script.name}`);

      const success = await runScript(script.path, script.name);

      if (!success) {
        allSuccessful = false;
        console.log(`\n💥 ${script.name} failed. Stopping cleanup sequence.`);
        break;
      }

      if (i < scripts.length - 1) {
        console.log(`\n⏸️  Pausing 2 seconds before next script...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Final summary
    console.log(`\n${"=".repeat(80)}`);
    if (allSuccessful) {
      console.log(`🎉 Complete dev environment cleanup finished successfully!`);
      console.log(`\n📊 What was cleaned:`);
      console.log(
        `  🗄️  Database tables: sessionFiles, sorterGroups, sorterHistory, sorterItems, sorters, sortingResults, uploadSessions`,
      );
      console.log(`  📁 R2 folders: sessions/, sorters/`);
      console.log(`\n🛡️  What was preserved:`);
      console.log(
        `  👤 Database: user, account, session, verificationToken tables`,
      );
      console.log(`  🖼️  R2 storage: avatars/ folder`);
      console.log(
        `\n✅ Your dev environment is now clean and ready for fresh testing!`,
      );
    } else {
      console.log(
        `❌ Cleanup sequence failed. Some operations may have completed successfully.`,
      );
      console.log(
        `\n🔍 Check the logs above for details on what succeeded and what failed.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Cleanup sequence failed:", error);
    process.exit(1);
  }
}

// Safety confirmation
function askForConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      "⚠️  WARNING: This will permanently delete all sorter data from your dev environment!",
    );
    console.log("🛡️  Users and avatars will be preserved.");
    console.log("");

    rl.question(
      "Are you sure you want to continue? (type 'yes' to confirm): ",
      (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase() === "yes");
      },
    );
  });
}

// Main execution
async function main() {
  const confirmed = await askForConfirmation();

  if (!confirmed) {
    console.log("❌ Cleanup cancelled by user.");
    process.exit(0);
  }

  console.log("✅ Confirmation received. Starting cleanup...\n");
  await cleanupAll();
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
