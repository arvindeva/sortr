CREATE TABLE "sorterTags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sorterTags_sorterId_name_unique" UNIQUE("sorterId","name"),
	CONSTRAINT "sorterTags_sorterId_slug_unique" UNIQUE("sorterId","slug")
);
--> statement-breakpoint
ALTER TABLE "sorterItems" ADD COLUMN "tagSlugs" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "sorterTags" ADD CONSTRAINT "sorterTags_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sorter_tags_sort_order_idx" ON "sorterTags" USING btree ("sorterId","sortOrder");--> statement-breakpoint
CREATE INDEX "sorter_items_tag_slugs_idx" ON "sorterItems" USING gin ("tagSlugs");