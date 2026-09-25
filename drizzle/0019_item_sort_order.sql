ALTER TABLE "sorterItems" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Freeze each sorter's CURRENT display order (heap-scan order) into the new
-- column, so no existing sorter visibly changes when reads start ordering by
-- it. row_number() without ORDER BY numbers rows in scan order — the same
-- order the previously ORDER-BY-less reads returned.
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY "sorterId") - 1 AS rn
  FROM "sorterItems"
)
UPDATE "sorterItems" si SET "sortOrder" = ordered.rn
FROM ordered WHERE si.id = ordered.id;
--> statement-breakpoint
CREATE INDEX "sorter_items_sort_order_idx" ON "sorterItems" ("sorterId","sortOrder");
