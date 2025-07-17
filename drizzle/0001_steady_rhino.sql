-- Add slug column as nullable first
ALTER TABLE "sorters" ADD COLUMN "slug" text;--> statement-breakpoint

-- Update existing records with generated slugs (this will be handled by API call)
-- For now, we'll set a placeholder value for existing records
UPDATE "sorters" SET "slug" = CONCAT(LOWER(REPLACE("title", ' ', '-')), '-', SUBSTR(MD5(RANDOM()::text), 1, 5)) WHERE "slug" IS NULL;--> statement-breakpoint

-- Now make it NOT NULL and add unique constraint
ALTER TABLE "sorters" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sorters" ADD CONSTRAINT "sorters_slug_unique" UNIQUE("slug");