#!/usr/bin/env tsx

/**
 * Manual cache invalidation script
 * Usage: npx tsx scripts/invalidate-cache.ts
 */

async function invalidateAllCaches() {
  console.log("🧹 Invalidating all cached pages...");
  
  try {
    // Use comprehensive approach: both tags and paths
    const response = await fetch("http://localhost:3000/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidation-secret": "dev-cleanup",
      },
      body: JSON.stringify({ 
        tags: [
          "homepage-popular-sorters",
          "browse-sorters", 
          "user-profiles",
          "sorter-details"
        ],
        paths: [
          "/",           // Homepage
          "/browse",     // Browse page  
          "/user",       // User profile prefix
          "/sorter",     // Sorter detail prefix
          "/rankings"    // Rankings prefix
        ]
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Invalidated all caches (tags + paths) - timestamp: ${result.timestamp}`);
      console.log(`\n🎉 Cache invalidation completed! Refresh your browser to see the changes.`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Failed to invalidate caches: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Could not reach revalidation API:`, (error as Error).message);
    console.log(`   💡 Tip: Make sure the dev server is running on localhost:3000`);
  }
}

// Run the invalidation
invalidateAllCaches().catch((error) => {
  console.error("💥 Cache invalidation script failed:", error);
  process.exit(1);
});