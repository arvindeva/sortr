-- Drop group-related objects if they exist
DROP TABLE IF EXISTS "sorterGroups" CASCADE;
-- Drop columns if they exist
ALTER TABLE "sorterItems" DROP COLUMN IF EXISTS "groupId";
ALTER TABLE "sorters" DROP COLUMN IF EXISTS "use_groups";  
ALTER TABLE "sortingResults" DROP COLUMN IF EXISTS "selectedGroups";