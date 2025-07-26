ALTER TABLE "sortingResults" DROP CONSTRAINT "sortingResults_sorterId_sorters_id_fk";
--> statement-breakpoint
ALTER TABLE "sortingResults" ALTER COLUMN "sorterId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD COLUMN "sorterTitle" text;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD COLUMN "sorterCoverImageUrl" text;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD CONSTRAINT "sortingResults_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE set null ON UPDATE no action;