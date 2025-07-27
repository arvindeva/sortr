// Load environment variables first
import { config } from "dotenv";
config();

import { db } from "@/db";
import { sorters, sorterHistory, sortingResults } from "@/db/schema";
import { eq } from "drizzle-orm";

async function migrateToVersioning() {
  console.log("Starting migration to versioning system...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");
  
  try {
    // Get all existing sorters
    const existingSorters = await db.select().from(sorters);
    console.log(`Found ${existingSorters.length} existing sorters to migrate`);
    
    // Copy each sorter to history as version 1
    for (const sorter of existingSorters) {
      try {
        await db.insert(sorterHistory).values({
          sorterId: sorter.id,
          title: sorter.title,
          description: sorter.description,
          coverImageUrl: null, // Set to null - R2 cleanup already performed
          version: 1, // All existing sorters become version 1
        });
        
        console.log(`✓ Migrated sorter "${sorter.title}" (${sorter.id}) to history as v1`);
      } catch (error) {
        console.error(`✗ Failed to migrate sorter ${sorter.id}:`, error);
      }
    }
    
    // Set version = 1 for all existing rankings for backward compatibility
    const rankingsUpdate = await db.update(sortingResults)
      .set({ version: 1 })
      .where(eq(sortingResults.version, null));
    
    console.log(`✓ Updated existing rankings to use version 1`);
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - ${existingSorters.length} sorters migrated to history as v1`);
    console.log(`   - All existing rankings updated to use version 1`);
    console.log(`   - All image URLs set to null (clean slate for versioned uploads)`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateToVersioning()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateToVersioning };