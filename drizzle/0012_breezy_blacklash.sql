CREATE TABLE "uploadBatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"expectedCount" integer NOT NULL,
	"uploadedCount" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "sorters" ADD COLUMN "status" varchar(16) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "uploadBatches" ADD CONSTRAINT "uploadBatches_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;