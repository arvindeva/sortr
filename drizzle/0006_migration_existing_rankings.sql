-- Migrate existing rankings to include sorter snapshots
UPDATE "sortingResults"
SET 
  "sorterTitle" = s.title,
  "sorterCoverImageUrl" = s."coverImageUrl"
FROM sorters s
WHERE "sortingResults"."sorterId" = s.id
  AND "sortingResults"."sorterTitle" IS NULL;